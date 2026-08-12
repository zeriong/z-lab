import { App } from './app';

async function main(): Promise<void> {
  const app = new App();
  await app.start();
}

main().catch(console.error);
