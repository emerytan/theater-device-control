import net from 'node:net'
import { io } from '../server.js'
import { CMD } from './barcoDC.js'
import { getStates } from './barcoDC.js'
import { getMacros } from './barcoDC.js'
import { writeMacro } from './barcoDC.js'
import { ipcLocal } from '../server.js'


const commandSuccess = Buffer.from(CMD.success)
const ACK = Buffer.from(CMD.ACK)
console.log('projector module running');

const thisDevice = {}
let projector = {}
const barcoStates = {
	macros: ['']
};


io.on('connection', function (socket) {
	console.log('projector websockets running')

	socket.on('page loaded', (msg) => {
		console.log(`projector module: ${msg.message}`);
		updatePage(socket, barcoStates)
	})

	socket.on('dowser', (msg) => {
		console.log('projector module');
		console.log(msg);
	})

	socket.on('change macro', function (msg) {
		var setMacro = msg.macroName
		barcoStates.lastCommand = 'macro'
		console.log(`setMacro ${setMacro}`)
		writeMacro(projector, setMacro)
		console.log('projector: writing macro ' + setMacro)
	})
})

ipcLocal.on('init projector', (msg) => {
	io.sockets.emit('server messages', 'hello from projector module')
	thisDevice.host = msg.host
	thisDevice.port = msg.port
	barcoStates.theater = msg.theater
	console.log(`projector module ipcLocal: 
			host: ${msg.host}
			port: ${msg.port}
			`)

	projector = net.connect({
		host: thisDevice.host,
		port: thisDevice.port
	})

	ipcLocal.on('disconnect projector', (msg) => {
		console.log('projector module, request to disconnect')
		console.log(msg)
		projector.end()
		barcoStates.macros = ['']
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
		console.log('projector tcp connection closed')
		console.log(barcoStates)
		io.sockets.emit('projector connection', {
			ip: barcoStates.host,
			online: barcoStates.online
		})
	})

	let cunt = 0
	projector.on('data', function dataEventHandler(data) {
		cunt ++
		console.log(`cunt: ${cunt}`);
		// console.log(data.toJSON())
		var x = data.indexOf(0x06, 0);
		if (data[2] === 0 && x === 3) {
			x = 8
		} else if (x === -1 || x !== 3) {
			x = 2
		};
		var y = x + 1
		var z = x + 2

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
			};
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
					setTimeout(() => {
						barcoStates.macroIndex = barcoStates.macros.indexOf(barcoStates.lastMacro)
						io.sockets.emit('macros', {
							list: barcoStates.macros,
							selected: barcoStates.macroIndex
						})
						io.sockets.emit('last macro', barcoStates.lastMacro)
					}, 1000)
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
