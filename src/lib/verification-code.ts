const ALPHABET = "ABCDEFGHIJKLMNPQRSTUVWXYZ123456789";

/** Bio-verification code, e.g. `iclips 985RT3`. */
export function makeVerificationCode() {
  let out = "";
  for (let i = 0; i < 6; i++) out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return `iclips ${out}`;
}
