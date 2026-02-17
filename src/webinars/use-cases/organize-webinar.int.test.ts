import { PrismaClient } from '@prisma/client';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { exec } from 'child_process';
import { PrismaWebinarRepository } from 'src/webinars/adapters/webinar-repository.prisma';
import { OrganizeWebinars } from 'src/webinars/use-cases/organize-webinar';
import { RealDateGenerator } from 'src/core/adapters/real-date-generator';
import { RealIdGenerator } from 'src/core/adapters/real-id-generator';
import { promisify } from 'util';

const asyncExec = promisify(exec);

describe('OrganizeWebinars Integration', () => {
  let container: StartedPostgreSqlContainer;
  let prismaClient: PrismaClient;
  let repository: PrismaWebinarRepository;
  let useCase: OrganizeWebinars;

  beforeAll(async () => {
    container = await new PostgreSqlContainer()
      .withDatabase('test_db')
      .withUsername('user_test')
      .withPassword('password_test')
      .withExposedPorts(5432)
      .start();

    const dbUrl = container.getConnectionUri();
    prismaClient = new PrismaClient({
      datasources: {
        db: { url: dbUrl },
      },
    });

    await asyncExec(`DATABASE_URL=${dbUrl} npx prisma migrate deploy`);
    await prismaClient.$connect();
  }, 100000);

  beforeEach(async () => {
    repository = new PrismaWebinarRepository(prismaClient);
    useCase = new OrganizeWebinars(
        repository,
        new RealIdGenerator(),
        new RealDateGenerator(),
    );
    await prismaClient.webinar.deleteMany();
    await prismaClient.$executeRawUnsafe('DELETE FROM "Webinar" CASCADE');
  });

  afterAll(async () => {
    await container.stop({ timeout: 1000 });
    return prismaClient.$disconnect();
  });

  it('should organize a webinar', async () => {
    // ACT
    const response = await useCase.execute({
        userId: 'organizer-id',
        title: 'New Webinar',
        seats: 100,
        startDate: new Date('2050-01-01T00:00:00Z'),
        endDate: new Date('2050-01-01T01:00:00Z'),
    });

    // ASSERT
    expect(response.id).toBeDefined();
    
    const createdWebinar = await prismaClient.webinar.findUnique({
        where: { id: response.id },
    });
    expect(createdWebinar).not.toBeNull();
    expect(createdWebinar?.title).toBe('New Webinar');
  });
});
