
const mongoose = require('mongoose')
mongoose.connect('mongodb://localhost:27017/playhiveDB').then(() => 
    {
    console.log('Connection Established for Tournament');
}).catch(err => {
    console.error('Database connection error: In Tournaments', err);
});

var Tournament = new mongoose.Schema({
    username: {
        type: String
    },
    email: {
        type: String
    },
    gamename: {
        type: String
    },
    gameid: {
        type: Number
    },
    date: {
        type: Date,
        default: Date.now,
    },
    tname: {
        type: String
    },
    entryFee: {
        type: Number,
        required: false
    },
    prize1: {
        type: Number,
        required: false
    },
    prize2: {
        type: Number,
        required: false
    },
    prize3: {
        type: Number,
        required: false
    }
})

module.exports = mongoose.model('tournaments', Tournament)

