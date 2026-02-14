import nodemailer from "nodemailer";
import { google } from "googleapis";

const oAuth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.SECRET_TOKEN,
  "https://developers.google.com/oauthplayground"
);

oAuth2Client.setCredentials({ refresh_token: process.env.REFRESH_TOKEN });

export async function getTransporter() {
  const accessToken = await oAuth2Client.getAccessToken();

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      type: "OAuth2",
      user: process.env.SMTP_USER,
      clientId: process.env.CLIENT_ID,
      clientSecret: process.env.SECRET_TOKEN,
      refreshToken: process.env.REFRESH_TOKEN,
      accessToken: accessToken.token,
    },
    tls: { rejectUnauthorized: false }, // avoids issues on Render
    pool: true,
  });
}
