const express = require('express');
const bodyParser = require('body-parser');
const {sequelize} = require('./model')
const {getProfile} = require('./middleware/getProfile')
const {AdminService, ContractService, JobService } = require('./service');
const {ResponseHandler} = require('./responseHandler')
const app = express();
app.use(bodyParser.json());
app.set('sequelize', sequelize)
app.set('models', sequelize.models)

/**
 * FIX ME!
 * @returns contract by id
 */
app.get('/contracts/:id', getProfile , async (req, res) =>{
    try {
        const response = await ContractService.getSingle({contractId: req.params.id, client: req.profile});
        res.json(ResponseHandler.success(response))
    } catch (error) {
        const errorResponse = ResponseHandler.error(error, error.message)
        res.status(errorResponse.code).json(errorResponse)
    }
   
})

app.get('/contracts', getProfile , async (req, res) =>{
    try {
        const response = await ContractService.getAll(req.profile);
        res.json(ResponseHandler.success(response))
    } catch (error) {
        const errorResponse = ResponseHandler.error(error, error.message)
        res.status(errorResponse.code).json(errorResponse)
    }
})

app.get('/jobs/unpaid', getProfile , async (req, res) =>{
    try {
        const response = await JobService.allUnpaid(req.profile);
        res.json(ResponseHandler.success(response))
    } catch (error) {
        const errorResponse = ResponseHandler.error(error, error.message)
        res.status(errorResponse.code).json(errorResponse)
    }
})

app.post('/jobs/:job_id/pay', getProfile , async (req, res) =>{
    try {
        const response = await JobService.makePaymentForJob(req.params.job_id, req.profile);
        res.json(ResponseHandler.success(response))
    } catch (error) {
        const errorResponse = ResponseHandler.error(error, error.message)
        res.status(errorResponse.code).json(errorResponse)
    }
})

app.post('/balances/deposit/:userId', getProfile , async (req, res) =>{
    try {
        const response = await JobService.creditBalance(req.params.userId, req.body.amount);
        res.json(ResponseHandler.success(response))
    } catch (error) {
        const errorResponse = ResponseHandler.error(error, error.message)
        res.status(errorResponse.code).json(errorResponse)
    }
})

app.get('/admin/best-profession' , async (req, res) =>{
    try {
        const { start, end } = req.query;
        const response = await AdminService.bestProfession(start, end);
        res.json(ResponseHandler.success(response))
    } catch (error) {
        const errorResponse = ResponseHandler.error(error, error.message)
        res.status(errorResponse.code).json(errorResponse)
    }
})

app.get('/admin/best-clients', async (req, res) =>{
    try {
        const { start, end, limit } = req.query;
        const response = await AdminService.bestClients(start, end, limit);
        res.json(ResponseHandler.success(response))
    } catch (error) {
        const errorResponse = ResponseHandler.error(error, error.message)
        res.status(errorResponse.code).json(errorResponse)
    }
})
module.exports = app;
