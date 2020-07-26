let utilObj = {}

utilObj.spaceToSlash = function (wSpaces) { 
	return wSpaces.replace(/\s+/g, '_')
}

utilObj.calculateAge = function (birthday) { // birthday is a date
    var ageDifMs = Date.now() - birthday.getTime();
    var ageDate = new Date(ageDifMs); // miliseconds from epoch
    return Math.abs(ageDate.getUTCFullYear() - 1970);
}

// exports
module.exports = utilObj
