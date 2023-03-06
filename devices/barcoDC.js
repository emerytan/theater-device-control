let i = ''
let total = ''
let cmdSum = ''

function string2ascii(str) {
    var arr = [];
	var len = str.length;
    for (i = 0; i < len; i++) {
        arr[i] = str.charCodeAt(i)
    };

	return arr;
}

function chksumCalc(input) {
    cmdSum = 361
    total = 0;
    for (i = 0; i < input.length; i++) {
        total += input[i];
    }
    return (cmdSum + total) % 256;
}


const CMD = {
    success: [0xfe, 0x00, 0x00, 0x03, 0x01, 0x04, 0xff],
    ACK: [0xfe, 0x00, 0x00, 0x06, 0x06, 0xff],
    allMacs: [0xfe, 0x00, 0xe8, 0x05, 0x01, 0x26, 0x14, 0xff],
    mac1: [0xfe, 0x00, 0xe8, 0x05, 0x01, 238, 255],
    mac2: [254, 0, 232, 5, 2, 239, 255],
    mac3: [254, 0, 232, 5, 3, 240, 255],
    mac4: [254, 0, 232, 5, 4, 241, 255],
    mac5: [254, 0, 232, 5, 5, 242, 255],
    mac6: [254, 0, 232, 5, 6, 243, 255],
    lastMac: [0xfe, 0x00, 0xe8, 0x01, 0xe9, 0xff],
    powerOff: [254, 0, 0, 3, 2, 102, 107, 255],
    powerOn: [254, 0, 0, 3, 2, 101, 106, 255],
    lampRes: [254, 0, 118, 154, 1, 16, 255],
    powerRes: [254, 0, 103, 1, 102, 255],
    shutterRes: [254, 0, 33, 66, 1, 99, 255],
    powerRead: [254, 0, 103, 1, 104, 255],
    lampOff: [254, 0, 0, 3, 2, 118, 26, 0, 149, 255],
    lampOn: [254, 0, 0, 3, 2, 118, 26, 1, 150, 255],
    lampRead: [254, 0, 118, 154, 16, 255],
    shutterClose: [254, 0, 0, 3, 2, 35, 66, 0, 106, 255],
    shutterOpen: [254, 0, 0, 3, 2, 34, 66, 0, 105, 255],
    shutterRead: [254, 0, 33, 66, 99, 255],
    macroHeader: [254, 0, 232, 129],
    zoomIn: [0xfe, 0x00, 0x00, 0x03, 0x02, 0xf4, 0x82, 0x00, 0x7b, 0xff],
    zoomOut: [0xfe, 0x00, 0x00, 0x03, 0x02, 0xf4, 0x82, 0x01, 0x7c, 0xff],
    focusIn: [0xfe, 0x00, 0x00, 0x03, 0x02, 0xf4, 0x83, 0x00, 0x7c, 0xff],
    focusOut: [0xfe, 0x00, 0x00, 0x03, 0x02, 0xf4, 0x83, 0x01, 0x7d, 0xff],
    shiftUp: [0xfe, 0x00, 0x00, 0x03, 0x02, 0xf4, 0x81, 0x00, 0x7a, 0xff],
    shiftDown: [0xfe, 0x00, 0x00, 0x03, 0x02, 0xf4, 0x81, 0x01, 0x7b, 0xff],
    shiftLeft: [0xfe, 0x00, 0x00, 0x03, 0x02, 0xf4, 0x81, 0x02, 0x7c, 0xff],
    shiftRight: [0xfe, 0x00, 0x00, 0x03, 0x02, 0xf4, 0x81, 0x03, 0x7d, 0xff]
};


export { CMD }



export function getStates(projector) {
    setTimeout(pwRead, 200);
    setTimeout(lmpRead, 300);
    setTimeout(dowRead, 400);

    function pwRead() {
        projector.write(Buffer.from(CMD.powerRead));
    };

    function lmpRead() {
        projector.write(Buffer.from(CMD.lampRead));
    };

    function dowRead() {
        projector.write(Buffer.from(CMD.shutterRead));
    };

}

export function getMacros(projector) {
    setTimeout(allMacs, 500);
    setTimeout(macRead, 600);

    function mac1() {
        projector.write(Buffer.from(CMD.mac1));
    };

    function allMacs() {
        projector.write(Buffer.from(CMD.allMacs));
    };

    function mac2() {
        projector.write(Buffer.from(CMD.mac2));
    };

    function mac3() {
        projector.write(Buffer.from(CMD.mac3));
    };

    function mac4() {
        projector.write(Buffer.from(CMD.mac4));
    };

    function mac5() {
        projector.write(Buffer.from(CMD.mac5));
    };

    function mac6() {
        projector.write(Buffer.from(CMD.mac6));
    };

    function macRead() {
        projector.write(Buffer.from(CMD.lastMac));
    };

}

export function writeMacro(projector, macroName) {
    // var trim = macroName.slice(1);
    var decArr = string2ascii(macroName);
    var chkSUM = chksumCalc(decArr);
    var endPacket = [0, chkSUM, 255];
    var buildCMD = CMD.macroHeader.concat(decArr, endPacket);
    console.log('commands - barco: ');
	console.log(Buffer.from(buildCMD));
	projector.write(Buffer.from(buildCMD));
}

