import { hashPassword } from "../src/server/password.ts";

const password = process.argv[2];
if (!password) {
  console.error("usage: tsx scripts/genhash.ts <password>");
  process.exit(1);
}
hashPassword(password).then((hash) => {
  console.log(hash);
});
