import net from 'node:net'
import { io } from '../server.js'
import { CMD } from './barcoDC.js'
import { getStates } from './barcoDC.js'
import { getMacros } from './barcoDC.js'
import { writeMacro } from './barcoDC.js'
import { ipcLocal } from '../server.js'
import { cp750 } from './cp750.js'


const commandSuccess = Buffer.from(CMD.success)
const ACK = Buffer.from(CMD.ACK)
console.log('projector module running');

const thisDevice = {}
let projector = {}
const barcoStates = {
	macros: ['']
};



ipcLocal.on('devices disconnect', () => {
	projector.end()
})

ipcLocal.on('init projector', (msg) => {
	io.sockets.emit('server messages', 'hello from projector module')
	thisDevice.host = msg.host
	thisDevice.port = msg.port
	barcoStates.theater = msg.theater
	projector = net.connect({
		host: thisDevice.host,
		port: thisDevice.port
	})

	
	projector.on('connect', function () {
		thisDevice.online = true;
		thisDevice.event = 'connected';
		barcoStates.host = thisDevice.host
		barcoStates.online = thisDevice.online
		getStates(projector)
		barcoStates.lastCommand = 'getStates'
		getMacros(projector)
		barcoStates.lastCommand = 'getMacros'
		io.sockets.emit('projector connection', {
			ip: barcoStates.host,
			online: barcoStates.online,
			theater: barcoStates.theater
		})
		ipcLocal.emit('server update', true)
		io.sockets.emit('swift disco', true)
	});

	projector.on('error', function () {
		console.log('projector: ' + 'connection error.');
		thisDevice.online = false;
		thisDevice.event = 'error';
	});

	projector.on('close', function () {
		thisDevice.online = false
		thisDevice.event = 'close'
		barcoStates.online = thisDevice.online
        cp750.write(Buffer.from('exit\n'))
		console.log('projector: tcp connection closed')
		io.sockets.emit('projector connection', {
			ip: barcoStates.host,
			online: barcoStates.online
		})
		ipcLocal.emit('server update', false)
		io.sockets.emit('swift disco', false)
	})

	
	projector.on('data', function dataEventHandler(data) {
		let x = data.indexOf(0x06, 0);
		if (data[2] === 0 && x === 3) {
			x = 8
		} else if (x === -1 || x !== 3) {
			x = 2
		};
		let y = x + 1
		let z = x + 2

		if (data.equals(commandSuccess) === true) {
			
			console.log(`projector: succesful command: ${barcoStates.lastCommand}`);
			if (barcoStates.lastCommand == 'power' || barcoStates.lastCommand == 'lamp' || barcoStates.lastCommand == 'shutter') {
				switch (barcoStates.lastCommand) {
					case 'power':
						projector.write(Buffer.from(CMD.powerRead));
						setTimeout(function () {
							projector.write(Buffer.from(CMD.shutterRead));
						}, 10000);
						break;
					case 'lamp':
						projector.write(Buffer.from(CMD.lampRead));
						break;
					case 'shutter':
						projector.write(Buffer.from(CMD.shutterRead));
						break;
					default:
						console.log('error');
						break;
				};
			}

		};

		switch (data[x]) {
			case 0x76: /// lamp
				if (data[z] == 0) {
					console.log('projector: ' + 'lamp is off');
					barcoStates.lamp = false;
				} else if (data[z] == 1) {
					console.log('projector: ' + 'lamp is on');
					barcoStates.lamp = true;
				} else if (data[z] === 0x10) {
					console.log('projector: ' + 'lamp is sleeping');
					barcoStates.lamp = false;
				} else {
					console.log('error in lamp parse.');
				};
				io.sockets.emit('lamp', barcoStates.lamp)
				break
			case 0x67: // power
				if (data[y] == 0) {
					console.log('projector: ' + 'power is off');
					barcoStates.power = false;
				} else if (data[y] == 1) {
					console.log('projector: ' + 'power is on');
					barcoStates.power = true;
				} else {
					console.log('error in power parse.');
				}
				break
			case 0x21: // shitter
				if (data[z] == 0) {
					console.log('projector: ' + 'dowser is closed')
					barcoStates.shutter = false;
				} else if (data[z] == 1) {
					console.log('projector: ' + 'dowser is open')
					barcoStates.shutter = true;
				} else if (data[z] == 2) {
					console.log('projector: ' + 'dowser in sleep')
					barcoStates.shutter = false;
				} else {
					console.log('error in dowser parse.');
				}
				io.sockets.emit('dowser', barcoStates.shutter)
				break
			case 0xe8:
				let i = data.length - 3
				let k = data.indexOf(0xe8)
				const narr = data.subarray(k + 4, i)
				if (data[y] === 1) {
					console.log('last macro parse');
					barcoStates.lastMacro = data.toString('ascii', k + 2, i)
					barcoStates.macroIndex = barcoStates.macros.indexOf(barcoStates.lastMacro)
					setTimeout(() => {
						io.sockets.emit('macros', {
							list: barcoStates.macros,
							selected: barcoStates.macroIndex
						})
						io.sockets.emit('last macro', barcoStates.lastMacro)
						io.sockets.emit('swift macros', barcoStates.macros)
						// console.log(barcoStates)
					}, 1000)
				}
				if (data[y] === 5) {
					const cass = narr.toJSON().data
					let count = 0
					for (let index = 0; index < cass.length; index++) {
						if (cass[index] !== 0x00) {
							barcoStates.macros[count] += String.fromCharCode(cass[index])
						}
						if (cass[index] === 0x00) {
							count++
							barcoStates.macros[count] = ''
						}
					}
				}
				break;
			default:
				if (data.equals(ACK) === true && barcoStates.lastCommand === 'macro') {
					console.log('projector: ' + 'ACK -- run check macro');
					barcoStates.lastCommand = 'get macro';
					setTimeout(function () {
						projector.write(Buffer.from(CMD.lastMac));
					}, 4000);
				}
				break;
		}

	})
})


io.on('connection', function (socket) {
	console.log('projector websockets running')


	socket.on('page loaded', (msg) => {
		console.log(`projector module: ${msg.message}`);
		updatePage(socket, barcoStates)
	})


	socket.on('change macro', function (msg) {
		var setMacro = msg.macroName
		barcoStates.lastCommand = 'macro'
		console.log(msg)
		writeMacro(projector, setMacro)
		console.log('projector: writing macro ' + setMacro)
	})


	socket.on('barco command', function (val) {
		console.log(`socket:  }---> ${val.setting} <---{ ${val.state} }`)
		if (val.setting == 'lamp' || val.setting == 'shutter') {
			switch (val.setting) {
				case 'lamp':
					barcoStates.lastCommand = 'lamp';
					if (val.state === '0') {
						console.log(`socket: }---> ${val.setting} <---{ switched to off }`);
						projector.write(Buffer.from(CMD.lampOff));
					} 
					if (val.state === '1') {
						console.log(`socket: }---> ${val.setting} <---{ switched to on }`);
						projector.write(Buffer.from(CMD.lampOn))
					};
				break;
				case 'shutter':
					barcoStates.lastCommand = 'shutter';
					if (val.state === '0') {
						console.log(`socket: }---> ${val.setting} <---{ switched to closed }`);
						projector.write(Buffer.from(CMD.shutterClose));
					} 
					if (val.state === '1') {
						console.log(`socket: }---> ${val.setting} <---{ switched to open }`);
						projector.write(Buffer.from(CMD.shutterOpen));
					};
				break;
				default:
					console.log('lamp shutter command fail bitch');
				break;
			}
		}

		if (val.setting == 'lens') {
			barcoStates.lastCommand = val.state;
			switch (val.state) {
				case 'zoomIn':
					projector.write(Buffer.from(CMD.zoomIn));
					break;
				case 'zoomOut':
					projector.write(Buffer.from(CMD.zoomOut));
					break;
				case 'focusIn':
					projector.write(Buffer.from(CMD.focusIn));
					break;
				case 'focusOut':
					projector.write(Buffer.from(CMD.focusOut));
					break;
				case 'shiftUp':
					projector.write(Buffer.from(CMD.shiftUp));
					break;
				case 'shiftDown':
					projector.write(Buffer.from(CMD.shiftDown));
					break;
				case 'shiftLeft':
					projector.write(Buffer.from(CMD.shiftLeft));
					break;
				case 'shiftRight':
					projector.write(Buffer.from(CMD.shiftRight));
					break;
				default:
					break;
			};
		};
	})


	socket.on('projector disconnect', (msg) => {
		projector.end()
		barcoStates.macros = ['']
	})

})


function updatePage(socket, state) {
	if (state.online) {
		socket.emit('lamp', state.lamp)
		socket.emit('dowser', state.shutter)
		socket.emit('macros', {
			list: state.macros,
			selected: state.macroIndex
		})
		socket.emit('last macro', state.lastMacro)
		socket.emit('projector connection', {
			ip: state.host,
			online: state.online,
			theater: state.theater
		})
	}
	
}
