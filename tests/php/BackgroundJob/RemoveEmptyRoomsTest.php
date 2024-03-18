<?php

declare(strict_types=1);
/**
 * @copyright Copyright (c) 2021 Vitor Mattos <vitor@php.rio>
 *
 * @author Vitor Mattos <vitor@php.rio>
 *
 * @license GNU AGPL version 3 or any later version
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 */

namespace OCA\Talk\Tests\BackgroundJob;

use OCA\Talk\BackgroundJob\RemoveEmptyRooms;
use OCA\Talk\Federation\FederationManager;
use OCA\Talk\Manager;
use OCA\Talk\Room;
use OCA\Talk\Service\ParticipantService;
use OCA\Talk\Service\RoomService;
use OCP\AppFramework\Utility\ITimeFactory;
use OCP\Files\Config\IUserMountCache;
use Psr\Log\LoggerInterface;
use Test\TestCase;

class RemoveEmptyRoomsTest extends TestCase {
	/** @var ITimeFactory|MockObject */
	protected $timeFactory;
	/** @var Manager|MockObject */
	protected $manager;
	/** @var RoomService|MockObject */
	protected $roomService;
	/** @var ParticipantService|MockObject */
	protected $participantService;
	/** @var ParticipantService|MockObject */
	protected $federationManager;
	/** @var LoggerInterface|MockObject */
	protected $loggerInterface;
	/** @var IUserMountCache|MockObject */
	protected $userMountCache;

	public function setUp(): void {
		parent::setUp();

		$this->timeFactory = $this->createMock(ITimeFactory::class);
		$this->manager = $this->createMock(Manager::class);
		$this->roomService = $this->createMock(RoomService::class);
		$this->participantService = $this->createMock(ParticipantService::class);
		$this->federationManager = $this->createMock(FederationManager::class);
		$this->loggerInterface = $this->createMock(LoggerInterface::class);
		$this->userMountCache = $this->createMock(IUserMountCache::class);
	}

	public function getBackgroundJob(): RemoveEmptyRooms {
		return new RemoveEmptyRooms(
			$this->timeFactory,
			$this->manager,
			$this->roomService,
			$this->participantService,
			$this->federationManager,
			$this->loggerInterface,
			$this->userMountCache,
		);
	}

	public function testDoDeleteRoom(): void {
		$backgroundJob = $this->getBackgroundJob();

		$room = $this->createMock(Room::class);
		$room->method('getType')
			->willReturn(Room::TYPE_GROUP);
		$numDeletedRooms = self::invokePrivate($backgroundJob, 'numDeletedRooms');
		$this->assertEquals(0, $numDeletedRooms, 'Invalid default quantity of rooms');

		self::invokePrivate($backgroundJob, 'doDeleteRoom', [$room]);

		$numDeletedRooms = self::invokePrivate($backgroundJob, 'numDeletedRooms');
		$this->assertEquals(1, $numDeletedRooms, 'Invalid final quantity of rooms');
	}

	/**
	 * @dataProvider dataDeleteIfFileIsRemoved
	 */
	public function testDeleteIfFileIsRemoved(string $objectType, array $fileList, int $numDeletedRoomsExpected): void {
		$backgroundJob = $this->getBackgroundJob();

		$numDeletedRoomsActual = self::invokePrivate($backgroundJob, 'numDeletedRooms');
		$this->assertEquals(0, $numDeletedRoomsActual, 'Invalid default quantity of rooms');

		$room = $this->createMock(Room::class);
		$room->method('getType')
			->willReturn(Room::TYPE_GROUP);
		$room->method('getObjectType')
			->willReturn($objectType);

		$userMountCache = self::invokePrivate($backgroundJob, 'userMountCache');
		$userMountCache->method('getMountsForFileId')
			->willReturn($fileList);

		self::invokePrivate($backgroundJob, 'deleteIfFileIsRemoved', [$room]);

		$numDeletedRoomsActual = self::invokePrivate($backgroundJob, 'numDeletedRooms');
		$this->assertEquals($numDeletedRoomsExpected, $numDeletedRoomsActual, 'Invalid final quantity of rooms');
	}

	public static function dataDeleteIfFileIsRemoved(): array {
		return [
			['', [], 0],
			['email', [], 0],
			['file', ['fileExists'], 0],
			['file', [], 1],
		];
	}

	/**
	 * @dataProvider dataDeleteIfIsEmpty
	 */
	public function testDeleteIfIsEmpty(string $objectType, int $actorsCount, int $inviteCount, int $numDeletedRoomsExpected): void {
		$backgroundJob = $this->getBackgroundJob();

		$numDeletedRoomsActual = self::invokePrivate($backgroundJob, 'numDeletedRooms');
		$this->assertEquals(0, $numDeletedRoomsActual, 'Invalid default quantity of rooms');

		$room = $this->createMock(Room::class);
		$room->method('getType')
			->willReturn(Room::TYPE_GROUP);
		$room->method('getObjectType')
			->willReturn($objectType);
		$room->method('isFederatedConversation')
			->willReturn($inviteCount > 0);

		$this->federationManager->method('getNumberOfInvitations')
			->with($room)
			->willReturn($inviteCount);

		$participantService = self::invokePrivate($backgroundJob, 'participantService');
		$participantService->method('getNumberOfActors')
			->willReturn($actorsCount);

		self::invokePrivate($backgroundJob, 'deleteIfIsEmpty', [$room]);

		$numDeletedRoomsActual = self::invokePrivate($backgroundJob, 'numDeletedRooms');
		$this->assertEquals($numDeletedRoomsExpected, $numDeletedRoomsActual, 'Invalid final quantity of rooms');
	}

	public static function dataDeleteIfIsEmpty(): array {
		return [
			'room with user' => ['', 1, 0, 0],
			'room with fed invite' => ['', 0, 1, 0],
			'room to delete' => ['', 0, 0, 1],
			'file room with user' => ['file', 1, 0, 0],
			'email room with user' => ['email', 1, 0, 0],
			'email room without user' => ['email', 0, 0, 1]
		];
	}

	/**
	 * @dataProvider dataCallback
	 */
	public function testCallback(int $roomType, string $objectType, int $numDeletedRoomsExpected): void {
		$backgroundJob = $this->getBackgroundJob();
		$room = $this->createMock(Room::class);
		$room->method('getType')
			->willReturn($roomType);
		$room->method('getObjectType')
			->willReturn($objectType);
		$backgroundJob->callback($room);
		$numDeletedRoomsActual = self::invokePrivate($backgroundJob, 'numDeletedRooms');
		$this->assertEquals($numDeletedRoomsExpected, $numDeletedRoomsActual, 'Invalid final quantity of rooms');
	}

	public static function dataCallback(): array {
		return [
			[Room::TYPE_CHANGELOG, '', 0],
			[Room::TYPE_GROUP, 'file', 1],
		];
	}
}
