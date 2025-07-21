
const mongoose = require('mongoose')
mongoose.connect('mongodb+srv://kamleshkshirsagar80:aHlG6uxAPFBFxokW@cluster0.u9ubrnw.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0').then(() => 
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
    }
})

module.exports = mongoose.model('tournaments', Tournament)

