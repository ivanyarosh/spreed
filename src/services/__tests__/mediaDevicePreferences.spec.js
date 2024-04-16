import {
	getFirstAvailableMediaDevice,
	listMediaDevices,
	populateMediaDevicesPreferences,
	updateMediaDevicesPreferences,
} from '../mediaDevicePreferences.ts'

describe('mediaDevicePreferences', () => {
	afterEach(() => {
		// cleaning up the mess left behind the previous test
		jest.clearAllMocks()
	})

	// navigator.enumerateDevices() will list 'default' capture device first
	const audioInputDeviceDefault = { deviceId: 'default', groupId: 'def1234567890', kind: 'audioinput', label: 'Default' }
	const audioInputDeviceA = { deviceId: 'da1234567890', groupId: 'ga1234567890', kind: 'audioinput', label: 'Audio Input Device A' }
	const audioInputDeviceB = { deviceId: 'db1234567890', groupId: 'gb1234567890', kind: 'audioinput', label: 'Audio Input Device B' }

	const videoInputDeviceDefault = { deviceId: 'default', groupId: 'def4567890123', kind: 'videoinput', label: 'Default' }
	const videoInputDeviceA = { deviceId: 'da4567890123', groupId: 'ga4567890123', kind: 'videoinput', label: 'Video Input Device A' }
	const videoInputDeviceB = { deviceId: 'db4567890123', groupId: 'gb4567890123', kind: 'videoinput', label: 'Video Input Device B' }

	const audioOutputDeviceDefault = { deviceId: 'default', groupId: 'def7890123456', kind: 'audiooutput', label: 'Default' }
	const audioOutputDeviceA = { deviceId: 'da7890123456', groupId: 'ga7890123456', kind: 'audiooutput', label: 'Audio Output Device A' }
	const audioOutputDeviceB = { deviceId: 'db7890123456', groupId: 'gb7890123456', kind: 'audiooutput', label: 'Audio Output Device B' }

	const allDevices = [audioInputDeviceDefault, audioInputDeviceA, audioInputDeviceB,
		videoInputDeviceDefault, videoInputDeviceA, videoInputDeviceB,
		audioOutputDeviceDefault, audioOutputDeviceA, audioOutputDeviceB]
	const audioInputPreferenceList = [audioInputDeviceDefault, audioInputDeviceA, audioInputDeviceB]
	const videoInputPreferenceList = [videoInputDeviceDefault, videoInputDeviceA, videoInputDeviceB]

	describe('listMediaDevices', () => {
		it('list all input devices from preference lists', () => {
			const attributes = { devices: allDevices, audioInputId: undefined, videoInputId: undefined }
			const output = listMediaDevices(attributes, audioInputPreferenceList, videoInputPreferenceList)

			// Assert: should show all registered devices, apart from default / outputs
			const inputDevices = allDevices.filter(device => device.kind !== 'audiooutput' && device.deviceId !== 'default')
			inputDevices.forEach(device => {
				expect(output).toContain(device.deviceId)
			})
		})

		it('show selected devices from preference lists', () => {
			const attributes = { devices: allDevices, audioInputId: audioInputDeviceA.deviceId, videoInputId: videoInputDeviceA.deviceId }
			const output = listMediaDevices(attributes, audioInputPreferenceList, videoInputPreferenceList)

			// Assert: should show a label next to selected registered devices
			const selectedDeviceIds = [audioInputDeviceA.deviceId, videoInputDeviceA.deviceId]
			selectedDeviceIds.forEach(deviceId => {
				expect(output).toContain(deviceId + ' (selected)')
			})
		})

		it('show unplugged devices from preference lists', () => {
			const unpluggedDeviceIds = [audioInputDeviceA.deviceId, videoInputDeviceA.deviceId]
			const attributes = {
				devices: allDevices.filter(device => !unpluggedDeviceIds.includes(device.deviceId)),
				audioInputId: undefined,
				videoInputId: undefined,
			}
			const output = listMediaDevices(attributes, audioInputPreferenceList, videoInputPreferenceList)

			// Assert: should show a label next to unplugged registered devices
			unpluggedDeviceIds.forEach(deviceId => {
				expect(output).toContain(deviceId + ' (unplugged)')
			})
		})
	})

	describe('getFirstAvailableMediaDevice', () => {
		it('returns id of first available device from preference list', () => {
			const output = getFirstAvailableMediaDevice(allDevices, audioInputPreferenceList)

			// Assert: should return default id
			expect(output).toBe('default')
		})

		it('returns id of first available device from preference list (default device is unavailable)', () => {
			const output = getFirstAvailableMediaDevice(
				allDevices.filter(device => device.deviceId !== 'default'),
				audioInputPreferenceList,
			)

			// Assert: should return id of device A
			expect(output).toBe(audioInputPreferenceList[1].deviceId)
		})

		it('returns undefined if there is no available devices from preference list', () => {
			const output = getFirstAvailableMediaDevice(
				allDevices.filter(device => device.kind !== 'audioinput'),
				audioInputPreferenceList,
			)

			// Assert: should return provided fallback id
			expect(output).not.toBeDefined()
		})
	})

	describe('populateMediaDevicesPreferences', () => {
		beforeEach(() => {
			console.debug = jest.fn()
		})

		it('returns preference lists with all available devices', () => {
			const output = populateMediaDevicesPreferences(allDevices, [], [])

			// Assert: should contain all available devices, apart from default / outputs
			expect(output).toMatchObject({ newAudioInputList: audioInputPreferenceList, newVideoInputList: videoInputPreferenceList })
		})

		it('returns null if preference lists were not updated', () => {
			const output = populateMediaDevicesPreferences(allDevices, audioInputPreferenceList, videoInputPreferenceList)

			// Assert
			expect(output).toMatchObject({ newAudioInputList: null, newVideoInputList: null })
		})
	})

	describe('updateMediaDevicesPreferences', () => {
		it('returns null if preference lists were not updated (no id or default id provided)', () => {
			const ids = [null, undefined, 'default']

			const getOutput = (id) => {
				const attributes = { devices: allDevices, audioInputId: id, videoInputId: id }
				return updateMediaDevicesPreferences(attributes, audioInputPreferenceList, videoInputPreferenceList)
			}

			// Assert
			ids.forEach(id => {
				expect(getOutput(id)).toMatchObject({ newAudioInputList: null, newVideoInputList: null })
			})
		})

		it('returns updated preference lists (device A id provided)', () => {
			const attributes = { devices: allDevices, audioInputId: audioInputDeviceA.deviceId, videoInputId: videoInputDeviceA.deviceId }
			const output = updateMediaDevicesPreferences(attributes, audioInputPreferenceList, videoInputPreferenceList)

			// Assert: should put device A on top of default device
			expect(output).toMatchObject({
				newAudioInputList: [audioInputDeviceA, audioInputDeviceDefault, audioInputDeviceB],
				newVideoInputList: [videoInputDeviceA, videoInputDeviceDefault, videoInputDeviceB],
			})
		})

		it('returns null if preference lists were not updated (device A id provided but not available)', () => {
			const attributes = {
				devices: allDevices.filter(device => !['da1234567890', 'da4567890123'].includes(device.deviceId)),
				audioInputId: audioInputDeviceA.deviceId,
				videoInputId: videoInputDeviceA.deviceId,
			}
			const output = updateMediaDevicesPreferences(attributes, audioInputPreferenceList, videoInputPreferenceList)

			// Assert
			expect(output).toMatchObject({ newAudioInputList: null, newVideoInputList: null })
		})

		it('returns null if preference lists were not updated (all devices are not available)', () => {
			const attributes = {
				devices: allDevices.filter(device => !['audioinput', 'videoinput'].includes(device.kind)),
				audioInputId: audioInputDeviceA.deviceId,
				videoInputId: videoInputDeviceA.deviceId,
			}
			const output = updateMediaDevicesPreferences(attributes, audioInputPreferenceList, videoInputPreferenceList)

			// Assert
			expect(output).toMatchObject({ newAudioInputList: null, newVideoInputList: null })
		})

		it('returns updated preference lists (device B id provided, but not registered, default device and device A not available)', () => {
			const attributes = {
				devices: allDevices.filter(device => !['default', 'da1234567890', 'da4567890123'].includes(device.deviceId)),
				audioInputId: audioInputDeviceB.deviceId,
				videoInputId: videoInputDeviceB.deviceId,
			}
			const output = updateMediaDevicesPreferences(
				attributes,
				[audioInputDeviceDefault, audioInputDeviceA],
				[videoInputDeviceDefault, videoInputDeviceA],
			)

			// Assert: should put device C on top of device B, but not the device A
			expect(output).toMatchObject({
				newAudioInputList: [audioInputDeviceDefault, audioInputDeviceA, audioInputDeviceB],
				newVideoInputList: [videoInputDeviceDefault, videoInputDeviceA, videoInputDeviceB],
			})
		})
	})
})
