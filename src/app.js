import io from 'socket.io-client'
const socket = io.connect()

const appMessages = document.getElementById('appMessages')
const ioState = document.getElementById('ioState')
const headerText = document.getElementById('headerText')
const lensButtons = document.getElementsByTagName('input')
const macroList = document.getElementById('macroList')
const ipList = document.getElementById('ipList')
const lampPower = document.getElementById('lampPower')
const dowser = document.getElementById('dowser')
const projectorConnected = document.getElementById('projectorConnected')
const activeMacro = document.getElementById('activeMacro')
const connections = {
	state: false
}
const connectProjector = document.getElementById('connect')


document.addEventListener('DOMContentLoaded', function () {
	removeProjectors()
	ipList.options.length = 0
	appMessages.innerText = 'page fully loaded'
	appMessages.style.color = 'green'
	headerText.innerText = "CO3 Barco Web Control"
	headerText.style.color = 'green'

	document.getElementById('test1').addEventListener('click', () => {
		appMessages.innerText = 'test1'
		activateButtons(lensButtons, true)
	})

	document.getElementById('test2').addEventListener('click', () => {
		appMessages.innerText = 'test2'		
		activateButtons(lensButtons, false)
	})

	document.getElementById('test3').addEventListener('click', () => {
		appMessages.innerText = 'test3'		
	})

	document.getElementById('test4').addEventListener('click', () => {
		appMessages.innerText = 'test4'		
	})

    dowser.addEventListener('click', (ele) => {
		appMessages.innerText = 'dowser'
        console.log('dowser')
		socket.emit('dowser', 'dowser command')
	})

	document.addEventListener('click', function (event) {
		if (event.target.matches('.lens')) {
			let CMD = event.target.dataset
			appMessages.innerText = `action: ${CMD.action}  <--->   command: ${CMD.command}`
			socket.emit('barco command', {
				setting: CMD.action,
				state: CMD.command
			})
		} else if (event.target.matches('.test')) {
			if (event.target.id === "connect" && connections.state === false) {
				console.log("send connect socket")
				socket.emit('projector connect', {
					ip: ipList.options[ipList.selectedIndex].dataset.ip,
					action: 'connect',
					theater: ipList.options[ipList.selectedIndex].text
				})
			}
			if (event.target.id === "connect" && connections.state === true) {
				socket.emit("projector disconnect", {
					lastConnected: connections.lastConnected,
					action: 'disconnect'
				})
				removeProjectors()
			}
			if (event.target.id === "selectMacro") {
				console.log("send macro chnage request")
				console.log(`index: ${macroList.options[macroList.selectedIndex].value}`)
				console.log(`macroName: ${macroList.options[macroList.selectedIndex].text}`)
				socket.emit('change macro', {
					index: macroList.options[macroList.selectedIndex].value,
					macroName: macroList.options[macroList.selectedIndex].text
				})
			}
		}
	})
	

	// sockets

	socket.on('connect', () => {
		ioState.innerText = 'Web server online'
		ioState.style.color = 'green'
		socket.emit('page loaded', {
			message: 'hello world'
		})
		removeMacros()
	})


	socket.on('lamp', (msg) => {
		ioState.innerText = `lamp state socket: ${msg}`
		if (msg == true) {
			appMessages.innerText = 'lamp is on'
			lampPower.classList.remove('btn-dark')
			lampPower.classList.add('btn-success')
			lampPower.dataset.command = 0
			lampPower.value = 'On'
			connections.lamp = true
			activateButtons(lensButtons, false)
		} else if (msg == false) {
			appMessages.innerText = 'lamp is off'
			lampPower.classList.remove('btn-success')
			lampPower.classList.add('btn-dark')
			lampPower.dataset.command = 1
			lampPower.value = 'Off'
			connections.lamp = false
		} else {
			// appMessages.innerText = 'lamp power command fail'
		}
	})

	socket.on('dowser', (msg) => {
		ioState.innerText = `dowser state socket ${msg}`
        console.log(msg)
		if (msg == true) {
			appMessages.innerText = 'dowser is open'
			dowser.classList.remove('btn-dark')
			dowser.classList.add('btn-success')
			dowser.dataset.command = 0
			dowser.value = 'Open'
			connections.shutter = true
		} else if (msg == false) {
			appMessages.innerText = 'dowser is closed'
			dowser.classList.remove('btn-success')
			dowser.classList.add('btn-dark')
			dowser.dataset.command = 1
			dowser.value = 'Closed'
			connections.shutter = false
		} else {
			// appMessages.innerText = 'dowser command fail'
		}
	})

	socket.on('projectors', (arr) => {
		connections.projectors = arr
		console.table(arr)
		addProjectors(connections.projectors)	
	})

	socket.on('macros', (data) => {
		connections.macros = data.list
		connections.macroIndex = data.selected
		console.log(`macro index: ${data.selected}`);
		addMacros(data)
	})

	socket.on('last macro', (msg) => {
		activeMacro.innerText = `active preset:
		${msg}`
		activeMacro.style.color = 'goldenrod'
		activeMacro.style.fontSize = '.9em'
		connections.selectedMacro = msg
	})

	socket.on('disconnect', () => {
		ioState.innerText = "Web server down"
		ioState.style.color = 'red'
	})
	
	socket.on('io init', (msg) => {
		appMessages.innerText = 'io init socket'
		appMessages.style.color = 'orange'
	})

	socket.on('server messages', (msg) => {
		appMessages.innerText = msg
	})

	socket.on('projector connection', (msg) => {
		projectorConnected.innerText = `connected to: ${msg.theater}`
		if (msg.online === true) {
			projectorConnected.style.color = 'green'
			connectProjector.innerText = 'Disconnect'
			connectProjector.classList.remove('btn-dark')
			connectProjector.classList.add('btn-success')
			connections.ipIndex = connections.projectors.indexOf(msg.ip)
			connections.lastConnected = msg.ip
			connections.state = true
			connections.theater = msg.theater
			ipList.selectedIndex = connections.ipIndex
			ipList.disabled = true
			macroList.disabled = false
			activateButtons(lensButtons, false)
		}
		if (msg.online === false) {
			projectorConnected.style.color = 'red'
			connectProjector.innerText = 'Connect'
			connectProjector.classList.remove('btn-success')
			connectProjector.classList.add('btn-dark')
			connections.state = false
			ipList.disabled = false
			macroList.disabled = true
			clearPage()
			removeProjectors()
			removeMacros()
			activateButtons(lensButtons, true)
		}
		ioState.innerText = `${msg.ip} - ${msg.online}`
	})

})


function activateButtons(elements, action) {
	var t
	var i = 0
	while (t = elements[i++]) {
		t.disabled = action
	}
}

function addProjectors(arr) {
	removeProjectors()
	let opt
	for (let index = 0; index < arr.length; index++) {
		opt = document.createElement('option')
		opt.textContent = arr[index][1]
		opt.value = index
		opt.dataset.ip = arr[index][0]
		ipList.appendChild(opt)
	}
	ipList.selectedIndex = 2
}

function addMacros(macros) {
	removeMacros()
	let opt
	var arr = macros.list
	for (let index = 0; index < arr.length; index++) {
		opt = document.createElement('option')
		opt.textContent = arr[index]
		opt.value = index
		macroList.appendChild(opt)
	}
	macroList.selectedIndex = connections.macroIndex
}

function clearPage() {
	
	if (connections.shutter) {
		dowser.classList.remove('btn-success')
		dowser.classList.add('btn-dark')
		dowser.dataset.command = 1
		dowser.value = 'Closed'
		connections.shutter = false
	}
	
	if (connections.lamp) {
		lampPower.classList.remove('btn-success')
		lampPower.classList.add('btn-dark')
		lampPower.dataset.command = 1
		lampPower.value = 'Off'
		connections.lamp = false
	}

	
	ipList.selectedIndex = 2
	projectorConnected.innerText = ''
	activeMacro.innerText = ''
}


function removeProjectors() {
	let k = ipList.options.length - 1
	for (let i = k; i >= 0; i--) {
		macroList.options.remove(i)
	}
}

function removeMacros() {
	let k = macroList.options.length - 1
	for (let i = k; i >= 0; i--) {
		macroList.options.remove(i)
	}
}