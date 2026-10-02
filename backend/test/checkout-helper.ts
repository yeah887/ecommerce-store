import type request from 'supertest';

/**
 * Places an order the way the browser does: start a checkout, then complete it (with the mock provider,
 * approval is instant). Returns the first failing response, or the completed order's.
 */
export async function checkout(client: request.Agent, body: unknown) {
  const started = await client.post('/api/checkout').send(body as object);
  if (started.status !== 201) return started;
  return client.post(`/api/checkout/${started.body.checkoutId as string}/complete`).send();
}
