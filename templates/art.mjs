let count = 0;
export function art(kind) {
  const uid = `field-${++count}`;
  const names = { network: '电阻网络与边界观测', scan: '蛇形扫描与空间重构', catalog: '期刊与会议目录', persona: '多来源汇聚为人物视角', website: '个人主页与内容结构' };
  let drawing = '';
  if (kind === 'network') {
    drawing = `<defs><radialGradient id="${uid}"><stop stop-color="#8251a1"/><stop offset="1" stop-color="#272138"/></radialGradient></defs><rect width="600" height="260" fill="url(#${uid})"/>`;
    for (let y = 0; y < 5; y++) for (let x = 0; x < 8; x++) {
      const cx = 126 + x * 50, cy = 46 + y * 42;
      if (x < 7) drawing += `<path d="M${cx} ${cy}h50" stroke="#a487bb" stroke-width="1.5"/>`;
      if (y < 4) drawing += `<path d="M${cx} ${cy}v42" stroke="#a487bb" stroke-width="1.5"/>`;
      drawing += `<circle cx="${cx}" cy="${cy}" r="4" fill="${x === 0 || x === 7 || y === 0 || y === 4 ? '#e2c8f7' : '#9876af'}"/>`;
    }
    drawing += '<path d="M276 130h50" stroke="#f5d595" stroke-width="5"/>';
  } else if (kind === 'scan') {
    drawing = '<rect width="600" height="260" fill="#e8eef1"/>';
    for (let y = 0; y < 6; y++) for (let x = 0; x < 8; x++) drawing += `<rect x="${125 + x * 43}" y="${38 + y * 32}" width="37" height="26" rx="2" fill="${(x === 2 || x === 5 || y === 1 || y === 4) ? '#6d909a' : '#c9d8dd'}"/>`;
    drawing += '<path d="M105 51h382v32H105v32h382v32H105v32h382v32H105" stroke="#294e5e" stroke-width="1.5" fill="none" opacity=".7"/>';
  } else if (kind === 'catalog') {
    drawing = '<rect width="600" height="260" fill="#eeeaf4"/>';
    for (let i = 0; i < 3; i++) drawing += `<rect x="${100 + i * 140}" y="50" width="120" height="165" rx="5" fill="#fff" stroke="#c8bad9"/><rect x="${116 + i * 140}" y="69" width="40" height="5" rx="2" fill="#9873b0"/><path d="M${116 + i * 140} 102h87m-87 15h70m-70 15h82m-82 30h88m-88 15h60" stroke="#d8cfdf" stroke-width="4"/>`;
  } else if (kind === 'persona') {
    drawing = '<rect width="600" height="260" fill="#ececf3"/><path d="M100 75L300 130 100 195M190 42L300 130 190 220M300 130l165-50m-165 50 165 50" stroke="#b9adca" fill="none" stroke-width="2"/>';
    for (const [x, y, r] of [[100,75,14],[100,195,14],[190,42,14],[190,220,14],[300,130,42],[465,80,22],[465,180,22]]) drawing += `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" stroke="#9d86b4" stroke-width="2"/>`;
    drawing += '<path d="M285 122h30m-30 10h24m-24 10h18" stroke="#9677b1" stroke-width="3"/>';
  } else {
    drawing = '<rect width="600" height="260" fill="#f0edf3"/><rect x="110" y="35" width="380" height="190" rx="6" fill="#fff" stroke="#c9bed3"/><path d="M110 60h380" stroke="#dcd4e2"/><circle cx="126" cy="48" r="3" fill="#a285b6"/><path d="M140 85h150m-150 19h100m-100 25h200" stroke="#c4b3d1" stroke-width="5"/><rect x="388" y="78" width="68" height="65" rx="3" fill="#ebe4f0"/><g fill="#e5dceb"><rect x="140" y="160" width="95" height="45"/><rect x="252" y="160" width="95" height="45"/><rect x="364" y="160" width="95" height="45"/></g>';
  }
  return `<svg viewBox="0 0 600 260" role="img" aria-label="${names[kind]}概念示意图">${drawing}</svg>`;
}
