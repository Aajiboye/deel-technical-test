const { ContractService } = require('../service');
const { Contract, sequelize } = require('../model');
const { NotFoundError } = require('../errorHandler');
const { Op } = require('sequelize');

describe('ContractService', () => {
  describe('getSingle', () => {
    it('should return contract if found', async () => {
      // Mock data
      const payload = {
        contractId: 1,
        client: { id: 1 }
      };
      const mockContract = { id: 1 };
      Contract.findOne = jest.fn().mockResolvedValue(mockContract);

      // Test
      const result = await ContractService.getSingle(payload);
      expect(result).toEqual(mockContract);
      expect(Contract.findOne).toHaveBeenCalledWith({
        where: { id: payload.contractId, clientId: payload.client.id }
      });
    });

    it('should throw NotFoundError if contract not found', async () => {
      // Mock data
      const payload = {
        contractId: 1,
        client: { id: 1 }
      };
      Contract.findOne = jest.fn().mockResolvedValue(null);

      // Test
      await expect(ContractService.getSingle(payload)).rejects.toThrow(NotFoundError);
      expect(Contract.findOne).toHaveBeenCalledWith({
        where: { id: payload.contractId, clientId: payload.client.id }
      });
    });
  });

  describe('getAll', () => {
    it('should return all contracts with status not terminated', async () => {
      // Mock data
      const user = { id: 1 };
      const mockContracts = [{ id: 1 }, { id: 2 }];
      Contract.findAll = jest.fn().mockResolvedValue(mockContracts);

      // Test
      const result = await ContractService.getAll(user);
      expect(result).toEqual(mockContracts);
      expect(Contract.findAll).toHaveBeenCalledWith({
        where: {
          status: { [Op.ne]: 'terminated' },
          [Op.or]: { clientId: user.id, contractorId: user.id }
        }
      });
    });
  });
});
