let store = {};

function get(key){
  return store[key];
}

function set(key, value){
  store[key] = value;
}

function remove(key){
  delete store[key];
}

function contains(key){
  return !!store[key];
}

function clear(){
  store = {};
}

function getAll(){
  return store;
}

module.exports = {
  remove,
  getAll,
  get,
  set,
  contains,
  clear,
};
