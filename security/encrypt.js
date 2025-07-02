import bcrypt from 'bcrypt';

async function encryptPassword(password) {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    return hashedPassword;
}

async function comparePassword(password, hashedPassword) {
    const match = await bcrypt.compare(password, hashedPassword);
    return match;
}

export default { encryptPassword, comparePassword };