const zltest = function(){
  return 3 + 1;
};

let people = {};

const ary = [{'newIsCap': true, "capIsNew": false}];
const va = ['a', 'b', 'c'];
console.log(zltest());

function zltest2(){
  try{
    console.log('a');
  }catch(err){

  }
  for(var i = 0; i < 10; i++){
    console.log(i);
  }
  if(va.length == 3){
    console.log('3');
  }else if(va.length == 4){
    console.log('4');
  }else{
    console.log('2');
  }
  console.log(`hello, ${people.name}!`);
  console.log('test');
}

console.log(va[0]);

// 如果通过 if 和 else 使用多行代码块，把 else 放在 if 代码块关闭括号的同一行。
