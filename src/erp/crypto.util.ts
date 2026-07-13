import * as crypto from 'crypto';

const key = () => Buffer.from(process.env.ERP_CRYPT_KEY || '', 'hex');

export function cifrar(texto: string): string {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const enc = Buffer.concat([c.update(texto, 'utf8'), c.final()]);
  return `${iv.toString('hex')}.${c.getAuthTag().toString('hex')}.${enc.toString('hex')}`;
}

export function decifrar(blob: string): string {
  const [iv, tag, enc] = blob.split('.');
  const d = crypto.createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'hex'));
  d.setAuthTag(Buffer.from(tag, 'hex'));
  return Buffer.concat([d.update(Buffer.from(enc, 'hex')), d.final()]).toString('utf8');
}

export function hashChave(chave: string): string {
  return crypto.createHash('sha256').update(chave).digest('hex');
}

export function gerarChaveAgente(): string {
  return 'agt_' + crypto.randomBytes(32).toString('hex');
}
