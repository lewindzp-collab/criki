const Favorites = (function(){
  let store = new Set(JSON.parse(localStorage.getItem(CONFIG.FAV_KEY) || '[]'));
  const listeners = [];

  function key(channel){ return channel.url; }

  function has(channel){ return channel ? store.has(key(channel)) : false; }

  function toggle(channel){
    const k = key(channel);
    if (store.has(k)) store.delete(k); else store.add(k);
    localStorage.setItem(CONFIG.FAV_KEY, JSON.stringify([...store]));
    listeners.forEach(fn => fn());
  }

  function count(){ return store.size; }

  function onChange(fn){ listeners.push(fn); }

  return { has, toggle, count, onChange, key };
})();
