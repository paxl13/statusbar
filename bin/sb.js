#!/usr/bin/env node

let _ = require('lodash');
let term = require('terminal-kit').terminal;
let moment = require('moment');

let {spawn} = require('child_process');

let fromBuf = b => b.toString('utf-8');

let exec = (path, args) => {
  return new Promise((resolve, reject)  => {
    let p = spawn(path, args);
    let d = [];
    p.stdout.on('data', dI => d.push(fromBuf(dI)));
    p.on('exit', () => resolve(_.join(d, '')));
  });
};

let createMoment = t => moment(t, 'YYYY-MM-DD HH:mm:ss ZZ');

let getTotal = (fn) => () => fn()
  .then(JSON.parse)
  .then(d => _.map(d, d => {
    d.start = createMoment(d.start);
    d.end = createMoment(d.end);
    d.duration = moment.duration(d.end.diff(d.start));
    return d;
  }))
  .then(data => getCurrentTask()
    .then(n => {
      let init = moment.duration(n[1], 'HH:mm:ss');
      return _.reduce(data, (acc, {duration}) => acc.add(duration), init);
    }))
  .then(time => time.humanize());

let getTodayTotal = getTotal(() => exec('t', ['-f json', 't']));
let getWeekTotal = getTotal(() => exec('t', ['-f json', 'w']));

let getCurrentTask = () => exec('t', ['n'])
  .then(r => /: (.*) \((.*)\)/.exec(r))
  .then(r => _.isNull(r) ? ['', moment.duration('0:00'), 'no task'] : r);

//let getNextMtg = () => exec('gcal', ['list'])
//  .then(out => {
//    let lines = out.split('\n');
//    return _.get(linkkkes, 1, '').trim();
//  })
//
//  .then(next => {
//    console.log(next);
//  });

term.saveCursor();
setInterval(() => {
  Promise.all([
    getCurrentTask(),
    getTodayTotal(),
    getWeekTotal()
//    getNextMtg()
  ])
    .then(([now ,today, week, nMtg]) => {
      let w = term.width;
      term.clear();

      term.moveTo(1,1);
      term('Current: ');
      term.green(now[1]);
      term.dim(` (${now[2]})`);

      term.moveTo(1,2);
      term(`Today: `);
      term.green(today);
      term.gray(` - Week: ${week}`);

      term.moveTo(w/2, 1);
      let timeNow = moment().format('HH:mm:ss');
      term(timeNow);
    });
}, 1000);
