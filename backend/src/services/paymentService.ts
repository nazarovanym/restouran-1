import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface TerminalTransactionResult {
  success: boolean;
  referenceNumber: string; // RRN
  authCode: string;
  terminalId: string;
  errorMessage?: string;
}

export interface IPOSTerminalAdapter {
  processPayment(amount: number, currency: string, orderNumber: string): Promise<TerminalTransactionResult>;
}

// 1. Simulyasiya / Tədris POS Terminal Adapteri (Konfiqurasiyalı)
export class SimulatedPOSTerminalAdapter implements IPOSTerminalAdapter {
  private terminalId: string;
  private merchantId: string;

  constructor(terminalId = 'TRM-994-01-AZ', merchantId = 'MRC-BAKU-887') {
    this.terminalId = terminalId;
    this.merchantId = merchantId;
  }

  public async processPayment(amount: number, currency: string, orderNumber: string): Promise<TerminalTransactionResult> {
    // 600ms şəbəkə gecikməsini simulyasiya edirik
    await new Promise(resolve => setTimeout(resolve, 600));

    if (amount <= 0) {
      return {
        success: false,
        referenceNumber: '',
        authCode: '',
        terminalId: this.terminalId,
        errorMessage: 'Ödəniş məbləği 0-dan böyük olmalıdır'
      };
    }

    const rrn = '994' + Math.floor(100000000 + Math.random() * 900000000).toString();
    const authCode = Math.floor(100000 + Math.random() * 900000).toString();

    return {
      success: true,
      referenceNumber: rrn,
      authCode,
      terminalId: this.terminalId
    };
  }
}

// 2. Real Bank POS Terminal Adapteri (Paşa Bank / ABB / Digər Banklar üçün genişləndirilə bilən baza)
export class BankPOSTerminalAdapter implements IPOSTerminalAdapter {
  private endpointUrl: string;
  private apiKey: string;
  private terminalId: string;

  constructor(endpointUrl: string, apiKey: string, terminalId: string) {
    this.endpointUrl = endpointUrl;
    this.apiKey = apiKey;
    this.terminalId = terminalId;
  }

  public async processPayment(amount: number, currency: string, orderNumber: string): Promise<TerminalTransactionResult> {
    if (!this.endpointUrl || !this.apiKey) {
      throw new Error('Bank POS Terminal API konfiqurasiyası tapılmadı. Terminal parametrlərini yoxlayın.');
    }

    // Real bank terminal API sorğusu (e.g. REST və ya TCP Bridge)
    try {
      const response = await fetch(this.endpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          amount,
          currency,
          orderNumber,
          terminalId: this.terminalId
        })
      });

      const data: any = await response.json();
      if (!response.ok || !data.success) {
        return {
          success: false,
          referenceNumber: data.rrn || '',
          authCode: '',
          terminalId: this.terminalId,
          errorMessage: data.message || 'Bank terminalı tərəfindən ödəniş rədd edildi'
        };
      }

      return {
        success: true,
        referenceNumber: data.rrn,
        authCode: data.authCode,
        terminalId: this.terminalId
      };
    } catch (err: any) {
      return {
        success: false,
        referenceNumber: '',
        authCode: '',
        terminalId: this.terminalId,
        errorMessage: `Bank terminalına qoşulma xətası: ${err.message}`
      };
    }
  }
}

// POS Terminal Adapter Fabriki (Factory)
export class TerminalAdapterFactory {
  public static async getAdapter(): Promise<IPOSTerminalAdapter> {
    const settings = await prisma.restaurantSetting.findFirst();
    if (settings && settings.terminalType === 'BANK_API' && settings.terminalConfig) {
      try {
        const conf = JSON.parse(settings.terminalConfig);
        return new BankPOSTerminalAdapter(conf.endpointUrl, conf.apiKey, conf.terminalId);
      } catch (e) {
        return new SimulatedPOSTerminalAdapter();
      }
    }
    return new SimulatedPOSTerminalAdapter();
  }
}

// Qəbz Formatlayıcı (Receipt Formatter)
export class ReceiptService {
  public static generateReceiptText(order: any, restaurant: any, payments: any[]): string {
    const line = '------------------------------------------';
    const dline = '==========================================';
    const dateStr = new Date(order.createdAt).toLocaleString('az-AZ');

    let content = `
${dline}
        ${restaurant.name.toUpperCase()}
   ${restaurant.address}
   Tel: ${restaurant.phone}  VÖEN: ${restaurant.tin}
${dline}
Çek / Sifariş №: ${order.orderNumber}
Masa: ${order.table?.tableNumber || 'Masa'}  Bölmə: ${order.table?.section || 'Zal'}
Tarix: ${dateStr}
Kassir: ${order.cashier?.fullName || 'Kassa'}
${line}
Məhsul adı            Say   Qiymət     Məbləğ
${line}
`;

    for (const item of order.items) {
      const name = item.menuItem.name.padEnd(20).substring(0, 20);
      const qty = item.quantity.toString().padStart(3);
      const unit = item.unitPrice.toFixed(2).padStart(8);
      const total = item.totalPrice.toFixed(2).padStart(9);
      content += `${name} ${qty} ${unit} ${total} ₼\n`;
    }

    content += `${line}\n`;
    content += `Cəmi (Subtotal):           ${order.subtotal.toFixed(2).padStart(10)} ₼\n`;
    if (order.discountAmount > 0) {
      content += `Endirim:                  -${order.discountAmount.toFixed(2).padStart(10)} ₼\n`;
    }
    if (order.serviceFee > 0) {
      content += `Xidmət haqqı:              ${order.serviceFee.toFixed(2).padStart(10)} ₼\n`;
    }
    content += `${dline}\n`;
    content += `YEKUN ÖDƏNİLƏCƏK:          ${order.totalAmount.toFixed(2).padStart(10)} ₼\n`;
    content += `${line}\n`;

    content += `Ödəniş növləri:\n`;
    for (const p of payments) {
      const methodName = p.method === 'CASH' ? 'Nağd' : p.method === 'CARD_TERMINAL' ? 'Bank Kartı (POS)' : 'Qarışıq/Bölünmüş';
      content += `  * ${methodName}: ${p.amount.toFixed(2)} ₼\n`;
      if (p.method === 'CASH' && p.cashGiven) {
        content += `    Verilən Nağd: ${p.cashGiven.toFixed(2)} ₼ | Qalıq: ${p.changeGiven?.toFixed(2) || '0.00'} ₼\n`;
      }
      if (p.terminalReference) {
        content += `    RRN/Çek ref: ${p.terminalReference}\n`;
      }
    }

    content += `
${dline}
   Bizi seçdiyiniz üçün təşəkkür edirik!
          NUŞ OLSUN!
${dline}
`;
    return content;
  }
}
