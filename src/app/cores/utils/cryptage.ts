import * as CryptoJS from 'crypto-js';

const SECRET_KEY = '@!Simrh2024!#';
const REPLACE_CHAR = '-'; // Character to replace `/`

export const encrypt = (data: any) => {
  try {
    data = typeof data === 'string' ? data : JSON.stringify(data);
    const encrypted = CryptoJS.AES.encrypt(data, SECRET_KEY).toString();
    return encrypted.replace(/\//g, REPLACE_CHAR);
  } catch (error) {
    throw error;
  }
};

export const decrypt = (encryptedData: string | number) => {
  try {
    if (!encryptedData) {
      throw new Error('No data provided for decryption.');
    }
    const formattedData = encryptedData
      .toString()
      .replace(new RegExp(REPLACE_CHAR, 'g'), '/');
    const bytes = CryptoJS.AES.decrypt(formattedData, SECRET_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);


    if (!decrypted) {
      console.log(decrypted);
      throw new Error('Decryption failed. Invalid key or data.');
    }

    return JSON.parse(decrypted);
  } catch (error) {
    console.error('Error during decryption:');
    throw error;
  } 
};



// export const decrypte = (encryptedData: string | number) => {
//   try {
//     const formattedData = encryptedData.toString().replace(new RegExp(REPLACE_CHAR, 'g'), '/');
//     const bytes = CryptoJS.AES.decrypt(formattedData, SECRET_KEY).toString(CryptoJS.enc.Utf8);
//     return JSON.parse(bytes);
//   } catch (error) {
//     throw error;
//   }
// };

