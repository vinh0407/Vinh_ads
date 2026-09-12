import * as CryptoJS from 'crypto-js';

export class EncryptionUtil {
  private static key: string;

  static init(key: string) {
    this.key = key;
  }

  static encrypt(text: string): string {
    if (!this.key) {
      throw new Error('Encryption key not initialized');
    }
    return CryptoJS.AES.encrypt(text, this.key).toString();
  }

  static decrypt(encryptedText: string): string {
    if (!this.key) {
      throw new Error('Encryption key not initialized');
    }
    const bytes = CryptoJS.AES.decrypt(encryptedText, this.key);
    return bytes.toString(CryptoJS.enc.Utf8);
  }
}