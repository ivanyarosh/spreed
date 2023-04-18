<?php

declare(strict_types=1);

/**
 * @copyright Copyright (c) 2023 Joas Schilling <coding@schilljs.com>
 *
 * @author Joas Schilling <coding@schilljs.com>
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

namespace OCA\SpreedCheats\SpeechToText;

use OCP\Files\File;
use OCP\SpeechToText\ISpeechToTextProvider;

class LoremIpsumProvider implements ISpeechToTextProvider {

	public function getName(): string {
		return 'Lorem ipsum - Talk Integrationtests';
	}

	public function transcribeFile(File $file): string {
		if (str_contains($file->getName(), 'leave')) {
			throw new \RuntimeException('Transcription failed by name');
		}

		return 'Lorem ipsum';
	}
}
