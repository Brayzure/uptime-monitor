/*
* NPM MODULES
*/
const Eris = require('eris');
const request = require('request');

/*
* FILES
*/
const auth = require('./src/auth.json');
const config = require('./src/config.json');

/*
* EXTERNAL MODULES
*/
const db = require('./external/db.js');

/*
* SESSION VARIABLES
*/
let ready = false;
let mod = 0;

var client = new Eris(auth.token, {
	getAllUsers: true,
	maxShards: config.shards
});

db.connect().then(() => {
	console.log("Connect to Postgres database!");
	client.connect();
}).catch((err) => {
	// Something happened with the database connection
	throw err;
})

client.on('ready', () => {
	console.log("Ready! Let's get to work");
	let promises = []
	let newMembers = 0;

	db.beginTransaction().then(() => {
		client.guilds.forEach((guild) => {
			guild.members.forEach((member) => {
				promises.push(db.addMember(member));
			});
		});
	});

	

	console.log(`Found ${newMembers} that weren't in the database.`)

	// Wait for all promises to resolve
	Promise.all(promises).then(() => {
		console.log("Finished adding new members to the database, syncing last update time.");
		// Set last update time to now
		// TODO: Extrapolate old data?
		db.syncUpdate().then(() => {
			db.endTransaction().then(() => {
				console.log("Now we're ready!");
				ready = true;
			});
		}).catch((err) => {
			throw err;
		})
	}).catch((err) => {
		throw err;
	});
});

client.on('presenceUpdate', (member, oldMember) => {
	// Not ready to track changes
	if(!ready) {
		return;
	}
	if(oldMember && oldMember.status != "offline" && member.status == "offline") {
		db.updateMember(member, oldMember.status).then(() => {

		}).catch((err) => {
			throw err;
		});
	}
	else if(oldMember.status == "offline" && member.status != "offline") {
		db.updateMember(member, oldMember.status).then(() => {

		}).catch((err) => {
			throw err;
		});
	}
});

function saveMembers(mod) {
	let promises = []
	db.beginTransaction().then(() => {
		client.guilds.forEach((guild) => {
			guild.members.forEach((member) => {
				// Save 10% of members at a time
				if(member.user.id%10 === mod) {
					promises.push(db.updateMember(member));
				}
			});
		});
	}).catch((err) => {
		throw err;
	});
	
	mod = (mod + 1)%10;
	
	Promise.all(promises).then(() => {
		db.endTransaction();
	}).catch((err) => {
		throw err;
	});
}

/*
{
	id,
	guildid,
	startdate,
	totaltime,
	onlinetime,
	lastupdate,
	lastreset
}
*/