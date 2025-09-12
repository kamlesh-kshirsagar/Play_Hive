const mongoose = require('mongoose');

mongoose.connect('mongodb+srv://kamleshkshirsagar80:whTthlQRbsPUkKHV@cluster0.u9ubrnw.mongodb.net/playhiveDB').then(() => {
    console.log('Connection Established for Transaction');
}).catch(err => {
    console.error('Database connection error: In Transaction', err);
});

const TransactionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users',
        required: true
    },
    username: {
        type: String,
        required: true
    },
    tournamentId: {
        type: String,
        required: true
    },
    tournamentName: {
        type: String,
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    paymentId: {
        type: String,
        required: true
    },
    orderId: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed'],
        default: 'pending'
    },
    paymentMethod: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('transactions', TransactionSchema); 