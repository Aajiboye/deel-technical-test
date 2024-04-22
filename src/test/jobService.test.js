const { JobService } = require('../service');
const { Job, Profile, sequelize } = require('../model');
const { NotFoundError, BadRequestError } = require('../errorHandler');
const { Op } = require('sequelize');

describe('JobService', () => {
  describe('allUnpaid', () => {
    it('should return all unpaid jobs for a user', async () => {
      // Mock data
      const user = { id: 1 };
      const mockJobs = [{ id: 1 }, { id: 2 }];
      Job.findAll = jest.fn().mockResolvedValue(mockJobs);

      // Test
      const result = await JobService.allUnpaid(user);
      expect(result).toEqual(mockJobs);
      expect(Job.findAll).toHaveBeenCalledWith({
        include: {
          association: 'Contract',
          where: {
            status: { [Op.ne]: 'terminated' },
            [Op.or]: { clientId: user.id, contractorId: user.id }
          }
        },
        where: { paid: false }
      });
    });
  });

  describe('makePaymentForJob', () => {
    it('should make payment for a job if not already paid and transaction is successful', async () => {
      // Mock data
      const jobId = 1;
      const user = { id: 1 };
      const mockJob = { id: jobId, paid: false, paymentDate: null };
      const mockContract = { id: 1, ClientId: user.id, ContractorId: 2 };
      Job.findOne = jest.fn().mockResolvedValue(mockJob);
      sequelize.transaction = jest.fn().mockResolvedValue(true);
      mockJob.save = jest.fn().mockResolvedValue(mockJob);

      // Test
      const result = await JobService.makePaymentForJob(jobId, user);
      expect(result).toEqual(mockJob);
      expect(Job.findOne).toHaveBeenCalledWith({
        include: {
          association: 'Contract',
          where: { clientId: user.id }
        },
        where: { id: jobId }
      });
      expect(mockJob.save).toHaveBeenCalled();
      expect(mockJob.paid).toBe(true);
      expect(mockJob.paymentDate).toBeTruthy();
    });

    it('should throw BadRequestError if job is already paid', async () => {
      // Mock data
      const jobId = 1;
      const user = { id: 1 };
      const mockJob = { id: jobId, paid: true, paymentDate: new Date() };
      Job.findOne = jest.fn().mockResolvedValue(mockJob);

      // Test
      await expect(JobService.makePaymentForJob(jobId, user)).rejects.toThrow(BadRequestError);
      expect(Job.findOne).toHaveBeenCalledWith({
        include: {
          association: 'Contract',
          where: { clientId: user.id }
        },
        where: { id: jobId }
      });
    });

    it('should throw NotFoundError if job not found', async () => {
      // Mock data
      const jobId = 1;
      const user = { id: 1 };
      Job.findOne = jest.fn().mockResolvedValue(null);

      // Test
      await expect(JobService.makePaymentForJob(jobId, user)).rejects.toThrow(NotFoundError);
      expect(Job.findOne).toHaveBeenCalledWith({
        include: {
          association: 'Contract',
          where: { clientId: user.id }
        },
        where: { id: jobId }
      });
    });

    it('should throw BadRequestError if transaction fails', async () => {
      // Mock data
      const jobId = 1;
      const user = { id: 1 };
      const mockJob = { id: jobId, paid: false, paymentDate: null };
      const mockContract = { id: 1, ClientId: user.id, ContractorId: 2 };
      Job.findOne = jest.fn().mockResolvedValue(mockJob);
      sequelize.transaction = jest.fn().mockResolvedValue(false);

      // Test
      await expect(JobService.makePaymentForJob(jobId, user)).rejects.toThrow(BadRequestError);
      expect(Job.findOne).toHaveBeenCalledWith({
        include: {
          association: 'Contract',
          where: { clientId: user.id }
        },
        where: { id: jobId }
      });
    });
  });

  describe('performTransaction', () => {
    it('should perform a successful transaction between two profiles', async () => {
      // Mock data
      const debitProfileId = 1;
      const creditProfileId = 2;
      const amount = 100;
      const mockDebitProfile = { id: debitProfileId, balance: 200 };
      const mockCreditProfile = { id: creditProfileId, balance: 100 };
      Profile.findByPk = jest.fn().mockImplementation(id => {
        if (id === debitProfileId) return Promise.resolve(mockDebitProfile);
        if (id === creditProfileId) return Promise.resolve(mockCreditProfile);
        return Promise.resolve(null);
      });
      mockDebitProfile.decrement = jest.fn();
      mockCreditProfile.increment = jest.fn();

      // Test
      const result = await JobService.performTransaction(null, debitProfileId, creditProfileId, amount);
      expect(result).toBe(true);
      expect(mockDebitProfile.decrement).toHaveBeenCalledWith({ balance: amount }, expect.any(Object));
      expect(mockCreditProfile.increment).toHaveBeenCalledWith({ balance: amount }, expect.any(Object));
    });

    it('should throw an error if debit profile has insufficient funds', async () => {
      // Mock data
      const debitProfileId = 1;
      const creditProfileId = 2;
      const amount = 300;
      const mockDebitProfile = { id: debitProfileId, balance: 200 };
      const mockCreditProfile = { id: creditProfileId, balance: 100 };
      Profile.findByPk = jest.fn().mockImplementation(id => {
        if (id === debitProfileId) return Promise.resolve(mockDebitProfile);
        if (id === creditProfileId) return Promise.resolve(mockCreditProfile);
        return Promise.resolve(null);
      });
      mockDebitProfile.decrement = jest.fn();
      mockCreditProfile.increment = jest.fn();

      // Test
      await expect(JobService.performTransaction(null, debitProfileId, creditProfileId, amount)).rejects.toThrowError("Insufficient funds");
      expect(mockDebitProfile.decrement).not.toHaveBeenCalled();
      expect(mockCreditProfile.increment).not.toHaveBeenCalled();
    });

    it('should return false if debit or credit profile not found', async () => {
      // Mock data
      const debitProfileId = 1;
      const creditProfileId = 2;
      const amount = 100;
      Profile.findByPk = jest.fn().mockResolvedValue(null);

      // Test
      const result = await JobService.performTransaction(null, debitProfileId, creditProfileId, amount);
      expect(result).toBe(false);
    });
  });

  describe('creditBalance', () => {

    it('should throw BadRequestError if amount is not provided', async () => {
      // Test
      await expect(JobService.creditBalance(1, null)).rejects.toThrowError(BadRequestError);
    });

    it('should throw BadRequestError if user not found', async () => {
      // Mock data
      Profile.findByPk = jest.fn().mockResolvedValue(null);

      // Test
      await expect(JobService.creditBalance(1, 50)).rejects.toThrowError(BadRequestError);
    });

    it('should throw BadRequestError if amount exceeds maximum deposit limit', async () => {
      // Mock data
      const userId = 1;
      const amount = 200;
      const totalUnpaidJobs = 400;
      const mockUser = { id: userId, balance: 100 };
      Profile.findByPk = jest.fn().mockResolvedValue(mockUser);
      Job.sum = jest.fn().mockResolvedValue(totalUnpaidJobs);

      // Test
      await expect(JobService.creditBalance(userId, amount)).rejects.toThrowError(BadRequestError);
    });
  });
});
