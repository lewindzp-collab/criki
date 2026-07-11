const Ticker = (function(){
  const track = document.getElementById('tickerTrack');
  let matchStrings = [];
  let channelStrings = [];

  function build(){
    const items = matchStrings.length ? matchStrings : channelStrings;
    if (!items.length) return;
    const html = items.slice(0, 40).map(s => `<span>${escapeHTML(s)}</span>`).join('');
    track.innerHTML = html + html;
  }

  function setMatches(matches){
    matchStrings = matches.slice(0, 30).map(m => {
      const time = m.kickoff.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      return `${m.home.name} vs ${m.away.name} — ${time}`;
    });
    build();
  }

  function setChannels(channels){
    channelStrings = channels.slice(0, 40).map(c => c.name);
    if (!matchStrings.length) build();
  }

  function showUnavailable(){
    track.innerHTML = '<span>Feed unavailable — retry shortly</span>';
  }

  return { setMatches, setChannels, showUnavailable };
})();
