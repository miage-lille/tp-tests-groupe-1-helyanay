import { testUser } from 'src/users/tests/user-seeds';
import { InMemoryWebinarRepository } from 'src/webinars/adapters/webinar-repository.in-memory';
import { Webinar } from 'src/webinars/entities/webinar.entity';
import { ChangeSeats } from 'src/webinars/use-cases/change-seats';
import { WebinarNotFoundException } from 'src/webinars/exceptions/webinar-not-found';
import { WebinarNotOrganizerException } from 'src/webinars/exceptions/webinar-not-organizer';
import { WebinarReduceSeatsException } from 'src/webinars/exceptions/webinar-reduce-seats';
import { WebinarTooManySeatsException } from 'src/webinars/exceptions/webinar-too-many-seats';

describe('Feature : Change seats', () => {
  let repository: InMemoryWebinarRepository;
  let useCase: ChangeSeats;

  const webinarId = 'webinar-id';
  const webinar = new Webinar({
    id: webinarId,
    organizerId: testUser.alice.props.id,
    title: 'Webinar title',
    startDate: new Date('2024-01-01T00:00:00Z'),
    endDate: new Date('2024-01-01T01:00:00Z'),
    seats: 100,
  });

  beforeEach(() => {
    repository = new InMemoryWebinarRepository([webinar]);
    useCase = new ChangeSeats(repository);
  });

  describe('Scenario: Happy path', () => {
    const payload = {
      user: testUser.alice,
      webinarId,
      seats: 200,
    };

    it('should change the number of seats for a webinar', async () => {
      await whenUserChangeSeatsWith(payload);
      await thenUpdatedWebinarSeatsShouldBe(200);
    });
  });

  describe('Scenario: webinar does not exist', () => {
    it('should fail', async () => {
      const payload = {
        user: testUser.alice,
        webinarId: 'unknown-webinar-id',
        seats: 200,
      };
      await expect(whenUserChangeSeatsWith(payload)).rejects.toThrow(
        WebinarNotFoundException,
      );
      expectWebinarToRemainUnchanged();
    });
  });

  describe('Scenario: update the webinar of someone else', () => {
    it('should fail', async () => {
      const payload = {
        user: testUser.bob,
        webinarId,
        seats: 200,
      };
      await expect(whenUserChangeSeatsWith(payload)).rejects.toThrow(
        WebinarNotOrganizerException,
      );
      expectWebinarToRemainUnchanged();
    });
  });

  describe('Scenario: change seat to an inferior number', () => {
    it('should fail', async () => {
      const payload = {
        user: testUser.alice,
        webinarId,
        seats: 50,
      };
      await expect(whenUserChangeSeatsWith(payload)).rejects.toThrow(
        WebinarReduceSeatsException,
      );
      expectWebinarToRemainUnchanged();
    });
  });

  describe('Scenario: change seat to a number > 1000', () => {
    it('should fail', async () => {
      const payload = {
        user: testUser.alice,
        webinarId,
        seats: 1001,
      };
      await expect(whenUserChangeSeatsWith(payload)).rejects.toThrow(
        WebinarTooManySeatsException,
      );
      expectWebinarToRemainUnchanged();
    });
  });

  function expectWebinarToRemainUnchanged() {
    const webinar = repository.findByIdSync(webinarId);
    expect(webinar?.props.seats).toEqual(100);
  }

  async function whenUserChangeSeatsWith(payload: any) {
    await useCase.execute(payload);
  }

  async function thenUpdatedWebinarSeatsShouldBe(seats: number) {
    const updatedWebinar = await repository.findById(webinarId);
    expect(updatedWebinar?.props.seats).toEqual(seats);
  }
});