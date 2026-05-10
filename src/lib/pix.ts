 /**
  * Gera o payload do PIX (BRCode) estático ou dinâmico
  * Baseado no padrão EMV (QRCPS)
  */
 export function generatePixPayload(key: string, name: string, city: string, amount: number, orderId: string) {
   // Limpeza de dados
   const cleanKey = key.trim();
   const cleanName = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().slice(0, 25);
   const cleanCity = city.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().slice(0, 15);
   const strAmount = amount.toFixed(2);
 
   const f = (id: string, value: string) => {
     const len = value.length.toString().padStart(2, '0');
     return `${id}${len}${value}`;
   };
 
   // 00 - Payload Format Indicator (Fixo: 01)
   let payload = f('00', '01');
 
   // 26 - Merchant Account Information
   const gui = f('00', 'BR.GOV.BCB.PIX');
   const keyField = f('01', cleanKey);
   payload += f('26', gui + keyField);
 
   // 52 - Merchant Category Code (Fixo: 0000)
   payload += f('52', '0000');
 
   // 53 - Transaction Currency (Fixo: 986 - Real)
   payload += f('53', '986');
 
   // 54 - Transaction Amount
   payload += f('54', strAmount);
 
   // 58 - Country Code (Fixo: BR)
   payload += f('58', 'BR');
 
   // 59 - Merchant Name
   payload += f('59', cleanName);
 
   // 60 - Merchant City
   payload += f('60', cleanCity);
 
   // 62 - Additional Data Field Template
   const txid = f('05', orderId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 25) || '***');
   payload += f('62', txid);
 
   // 63 - CRC16 (Calculado ao final)
   payload += '6304';
 
   function crc16(data: string) {
     let crc = 0xFFFF;
     const polynomial = 0x1021;
 
     for (let i = 0; i < data.length; i++) {
       let b = data.charCodeAt(i);
       for (let j = 0; j < 8; j++) {
         let bit = ((b >> (7 - j) & 1) === 1);
         let c15 = ((crc >> 15 & 1) === 1);
         crc <<= 1;
         if (c15 ^ bit) crc ^= polynomial;
       }
     }
 
     crc &= 0xFFFF;
     return crc.toString(16).toUpperCase().padStart(4, '0');
   }
 
   payload += crc16(payload);
 
   return payload;
 }