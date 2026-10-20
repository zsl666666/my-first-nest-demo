import { Test, TestingModule } from '@nestjs/testing';
import { ReactAgentService } from './react-agent.service';

describe('ReactAgentService', () => {
  let service: ReactAgentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ReactAgentService],
    }).compile();

    service = module.get<ReactAgentService>(ReactAgentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it.each([
    ['(2 + 3) * 4', 20],
    ['2 + 3 * 4', 14],
    ['2 ** 3 ** 2', 512],
    ['-3 + 2 * -4', -11],
    ['1.5e2 / 3 + 5 % 2', 51],
  ])('calculates %s', async (expression, expected) => {
    await expect(service.tools[0].invoke({ expression })).resolves.toBe(
      `计算结果： ${expression} = ${expected}`,
    );
  });

  it.each(['process.exit()', '1 / 0', '(2 + 3', '2 +', ''])(
    'rejects invalid expression %s',
    async (expression) => {
      await expect(service.tools[0].invoke({ expression })).resolves.toMatch(
        /^计算错误：/,
      );
    },
  );
});
