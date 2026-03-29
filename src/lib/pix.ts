/**
 * Generates a PIX BR Code (EMV format) string for static QR codes.
 * Based on BACEN specification for PIX.
 */
export function generatePixBrCode({
  pixKey,
  merchantName,
  merchantCity,
  amount,
  description,
}: {
  pixKey: string;
  merchantName: string;
  merchantCity: string;
  amount?: number;
  description?: string;
}): string {
  const pad = (id: string, value: string) => {
    const len = value.length.toString().padStart(2, "0");
    return `${id}${len}${value}`;
  };

  // Merchant Account Info (ID 26)
  const gui = pad("00", "br.gov.bcb.pix");
  const key = pad("01", pixKey);
  const desc = description ? pad("02", description.slice(0, 25)) : "";
  const merchantAccountInfo = pad("26", gui + key + desc);

  // Build payload
  let payload = "";
  payload += pad("00", "01"); // Payload Format Indicator
  payload += merchantAccountInfo;
  payload += pad("52", "0000"); // Merchant Category Code
  payload += pad("53", "986"); // Transaction Currency (BRL)
  if (amount) {
    payload += pad("54", amount.toFixed(2));
  }
  payload += pad("58", "BR"); // Country Code
  payload += pad("59", merchantName.slice(0, 25));
  payload += pad("60", merchantCity.slice(0, 15));
  payload += pad("62", pad("05", "***")); // Additional Data Field

  // CRC16 (ID 63, length 04)
  payload += "6304";
  const crc = crc16ccitt(payload);
  payload += crc.toString(16).toUpperCase().padStart(4, "0");

  return payload;
}

function crc16ccitt(str: string): number {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc = crc << 1;
      }
    }
    crc &= 0xffff;
  }
  return crc;
}

export const PIX_CONFIG = {
  key: "04849830404",
  merchantName: "RODRIGO ROCHA MEIRE",
  merchantCity: "CAMACARI",
} as const;
