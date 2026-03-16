import mongoose from "mongoose";

const blacklistTokenSchema = new mongoose.Schema({
    token: {
        type: String,
        required: [ true, "token is required to be added in blacklist" ]
    }
}, {
    timestamps: true
})

const Blacklist = mongoose.model("Blacklist", blacklistTokenSchema);

export default Blacklist;