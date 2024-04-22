const { Profile, Contract, Job, sequelize } = require('./model')
const { NotFoundError, BadRequestError } = require('./errorHandler')
const { Op } = require('sequelize');


class ContractService {
 static async getSingle (payload) {
  const {contractId, client} = payload;
  const contract = await Contract.findOne({where: {id: contractId, clientId: client.id}})
  if(!contract) throw new NotFoundError("Contract Not Found")
  return contract;
  }

  static async getAll(user) {
    return Contract.findAll({
      where : {status: {[Op.ne]: 'terminated'}, [Op.or]: {clientId: user.id, contractorId: user.id} }
    }
    )
  }

}


class JobService {
  static async allUnpaid(user) {
    return Job.findAll(
      { 
        include: {
          association: 'Contract',
          where : {status: {[Op.ne]: 'terminated'}, 
          [Op.or]: {clientId: user.id, contractorId: user.id} }
          },
        where: { paid:false }
      }
  )
  }

  static async makePaymentForJob(jobId, user) {
    const job = await Job.findOne(  { 
      include: {
        association: 'Contract',
        where : { clientId: user.id }
        },
      where: { id:jobId }
    });
    if(!job) throw new NotFoundError("Job not found");
    if(job.paid) throw new BadRequestError(`Sorry, this job has already been paid for on ${job.paymentDate}`)
    
    const isTransactionSuccessful = await sequelize.transaction(async (transaction) => await this.performTransaction(transaction, job.Contract.ClientId, job.Contract.ContractorId, job.price))

    if(!isTransactionSuccessful) throw new BadRequestError("Could not complete transaction at the moment, please try again");
    job.paid = true;
    job.paymentDate = new Date();
    await job.save();
    return job
  }

  static async creditBalance(userId, amount) {
    if(!amount) throw new BadRequestError("Amount field is required");
    const user = await Profile.findByPk(userId)
    if(!user) throw new BadRequestError("User not found");
    const totalUnpaidJobs = await Job.sum('price', {
      where: {
        paid: false
      },
      include: [
        {
          model: Contract,
          where: {
            ClientId: userId
          }
        }
      ]
    }) || 0;
    const maxDepositAmount = totalUnpaidJobs * 0.25;
    if(amount > maxDepositAmount) throw new BadRequestError(`The maximum amount you can deposit is ${totalUnpaidJobs * 0.25}`);
    await user.increment({balance: amount});
    return user.reload();
  }

  static async performTransaction(transaction, debitProfileId, creditProfileId, amount){
    const [debitProfile, creditProfile] = await Promise.all([Profile.findByPk(debitProfileId, {transaction}), Profile.findByPk(creditProfileId, {transaction})]);
    if(!debitProfile || !creditProfile) return false;
    if(debitProfile.balance < amount) throw new Error("Insufficient funds");
    await debitProfile.decrement({balance:amount}, {transaction});
    await creditProfile.increment({balance:amount}, {transaction});
    return true;
  }
}

class AdminService {
  static async bestProfession(from, to) {
    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-04-22');

return Profile.findAll({
  include: [
    {
      model: Contract,
      as: 'Contractor',
      where: {
        createdAt: {
          [Op.between]: [startDate, endDate]
        }
      },
      include: {
        model: Job,
        attributes: [
          [sequelize.fn('SUM', sequelize.col('price')), 'totalPaid']
        ],
        where: { paid: true }
      }
    }
  ],
  attributes: [
    'profession',
    [sequelize.literal('"Contractor.Jobs.sum"'), 'totalPaid']
  ],
  group: ['Profile.profession'],
  order: [[sequelize.literal('totalPaid'), 'DESC']],
  limit: 1
});
  }
  
  static async bestClients(from, to, limit) {
    try {
      const startDate = new Date(from);
      const endDate = new Date(to);  
    } catch (error) {
      throw new ValidationError("Enter a valid start and end date");
    }
   
    const data = await Profile.findAll({
      include: [
        {
          model: Contract,
          as: 'Client',
          where: {
            createdAt: {
              [Op.between]: [startDate, endDate]
            }
          },
          include: {
            model: Job,
            attributes: {
            },
            where: { paid: true }
          }
        }
      ],
      attributes: [
        [sequelize.col('Profile.id'), 'id'],
        // [sequelize.col('Client.Jobs'), 'jobs'],
        [sequelize.fn('concat', sequelize.col('Profile.firstName'), ' ', sequelize.col('Profile.lastName')), 'fullName'],
        [sequelize.literal('(SELECT SUM("price") FROM "Jobs" WHERE "ContractId" = "Client"."id")'), 'totalPaid'],
          ],
      // order: [[sequelize.literal('paid'), 'DESC']],
      limit: limit || 2
    });
    return data;
  }

  
}

  


module.exports = {
  ContractService,
  JobService,
  AdminService
}