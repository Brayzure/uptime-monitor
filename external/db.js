const Postgres = require('pg');

const auth = require('../src/auth.json');
const config = require('../src/config.json');

var pg = new Postgres.Client({
	user: auth.pg_user,
	password: auth.pg_pass,
	database: auth.pg_db
});

const functions = {
	connect: () => {
		return new Promise((resolve, reject) => {
			pg.connect(function(err) {
				if (err) {
					return reject(err);
				}

				return resolve();
			});
		});
	},
	beginTransaction: () => {
		return new Promise((resolve, reject) => {
			pg.query('BEGIN', (err, result) => {
				if(err) {
					return reject(err);
				}

				return resolve();
			});
		});
	},
	endTransaction: () => {
		return new Promise((resolve, reject) => {
			pg.query('COMMIT', (err, result) => {
				if(err) {
					return reject(err);
				}

				return resolve();
			});
		});
	},
	addMember: (member) => {
		return new Promise((resolve, reject) => {
			let q = "INSERT INTO uptime VALUES ($1, $2, $3, $4, $5, $3, $3) ";
			q += "ON CONFLICT DO NOTHING";
			pg.query({
				text: q,
				values: [member.user.id, member.guild.id, new Date().toISOString(), 0, 0]
			}, (err, result) => {
				if (err) {
					return reject(err);
				}

				return resolve(err);
			});
		});
	},
	updateMember: (member, oldState) => {
		return new Promise((resolve, reject) => {
			let q = "UPDATE uptime SET totaltime = totaltime + (EXTRACT(EPOCH FROM ($2 - lastupdate)) * 1000), ";
			q += "onlinetime = onlinetime + CASE WHEN($1) THEN (EXTRACT(EPOCH FROM ($2 - lastupdate)) * 1000) ELSE (0) END, ";
			q += "lastupdate = $2 WHERE id = $3 AND guildid = $4";
			pg.query({
				text: q,
				values: [(oldState == "offline" ? false : true), new Date().toISOString(), member.user.id, member.guild.id]
			}, (err, result) => {
				if (err) {
					return reject(err);
				}
				return resolve();
			});
		});
	},
	syncUpdate: () => {
		return new Promise((resolve, reject) => {
			pg.query({
				text: "UPDATE uptime SET lastupdate = $1",
				values: [new Date().toISOString()]
			}, (err, result) => {
				if(err) {
					return reject(err);
				}
				
				return resolve();
			});
		});
	}
}

module.exports = functions;