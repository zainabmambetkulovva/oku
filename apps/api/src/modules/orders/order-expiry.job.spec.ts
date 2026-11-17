import { ConfigService } from '@nestjs/config';
import { OrderExpiryJob } from './order-expiry.job';
import { OrderLifecycleService } from './order-lifecycle.service';

const createJob = (env: { JOBS_ENABLED: boolean; ORDER_EXPIRY_ON_REQUEST: boolean }) => {
  const lifecycle = { expireUnpaid: jest.fn().mockResolvedValue(0) };
  const config = { get: (key: keyof typeof env) => env[key] } as unknown as ConfigService;
  const job = new OrderExpiryJob(lifecycle as unknown as OrderLifecycleService, config as never);
  return { job, lifecycle };
};

describe('OrderExpiryJob', () => {
  it('runs on schedule only when JOBS_ENABLED', async () => {
    const off = createJob({ JOBS_ENABLED: false, ORDER_EXPIRY_ON_REQUEST: false });
    await off.job.run();
    expect(off.lifecycle.expireUnpaid).not.toHaveBeenCalled();

    const on = createJob({ JOBS_ENABLED: true, ORDER_EXPIRY_ON_REQUEST: false });
    await on.job.run();
    expect(on.lifecycle.expireUnpaid).toHaveBeenCalledTimes(1);
  });

  it('expires on request at most once a minute when ORDER_EXPIRY_ON_REQUEST', async () => {
    const { job, lifecycle } = createJob({ JOBS_ENABLED: false, ORDER_EXPIRY_ON_REQUEST: true });
    await job.runOnRequest(1_000_000);
    await job.runOnRequest(1_030_000);
    expect(lifecycle.expireUnpaid).toHaveBeenCalledTimes(1);
    await job.runOnRequest(1_061_000);
    expect(lifecycle.expireUnpaid).toHaveBeenCalledTimes(2);
  });

  it('does nothing on request when the option is off', async () => {
    const { job, lifecycle } = createJob({ JOBS_ENABLED: true, ORDER_EXPIRY_ON_REQUEST: false });
    await job.runOnRequest();
    expect(lifecycle.expireUnpaid).not.toHaveBeenCalled();
  });

  it('does not fail the request when expiry throws', async () => {
    const { job, lifecycle } = createJob({ JOBS_ENABLED: false, ORDER_EXPIRY_ON_REQUEST: true });
    lifecycle.expireUnpaid.mockRejectedValueOnce(new Error('db down'));
    jest.spyOn(job['logger'], 'error').mockImplementation(() => undefined);
    await expect(job.runOnRequest()).resolves.toBeUndefined();
  });
});
