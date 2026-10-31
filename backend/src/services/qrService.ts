import crypto from 'crypto';
import QRCode from 'qrcode';

export class QRService {
  /**
   * Təxmin edilməsi qeyri-mümkün olan kriptoqrafik unikal masa tokeni yaradır
   */
  public static generateTableToken(tableNumber: string): string {
    const randomHex = crypto.randomBytes(8).toString('hex');
    const sanitizedNumber = tableNumber.toLowerCase().replace(/[^a-z0-9]/g, '_');
    return `tbl_${sanitizedNumber}_${randomHex}`;
  }

  /**
   * Masa tokeni üçün QR kod DataURL (Base64 PNG) generasiya edir
   */
  public static async generateQRCodeDataUrl(baseUrl: string, token: string): Promise<string> {
    const targetUrl = `${baseUrl}/order/${token}`;
    return await QRCode.toDataURL(targetUrl, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      margin: 2,
      scale: 8,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    });
  }
}
