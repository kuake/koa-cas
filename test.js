var t1 = async function(p1){
  console.log('.....in 1');
  return 'a';
};


async function startApp(){
  const ret = await t1('aaaa');
  console.log('...ret:');
  console.log(ret);
}

startApp().then(() => {
  console.log('end');
});
