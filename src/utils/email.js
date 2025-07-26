import nodemailer from 'nodemailer';
import config from '../config/index.js';

// Create a transporter object using the default SMTP transport
const transporter = nodemailer.createTransport({
    host: config.email.host,
    port: config.email.port,
    secure: config.email.secure, 
    auth: {
        user: config.email.username,
        pass: config.email.password,
    },
});

// Email sending function
export const sendEmail = async ({ email, subject, message }) => {
    try {
        const mailOptions = {
            from: `"${config.email.fromName}" <${config.email.fromAddress}>`,
            to: email,
            subject: subject,
            text: message,
            // html: `<b>${message}</b>` // You can add HTML version too
        };

        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error('Error sending email:', error);
        throw new Error('Email could not be sent');
    }
};

export default {
    sendEmail,
};