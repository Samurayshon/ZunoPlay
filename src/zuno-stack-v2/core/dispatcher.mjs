import{assertSerializableValue,rejectedTransition}from'./contracts.mjs';

function validCommand(command){return command&&typeof command==='object'&&typeof command.type==='string'&&command.type.length>0&&typeof command.actorId==='string'&&command.actorId.length>0&&command.payload&&typeof command.payload==='object'&&!Array.isArray(command.payload)}

export function dispatch(state,command,context){
  assertSerializableValue(state,'dispatch.state');
  if(!validCommand(command))return rejectedTransition(state,'INVALID_COMMAND');
  const rules=context?.rules;
  const handler=rules?.transitions?.[command.type];
  if(typeof handler!=='function')return rejectedTransition(state,'UNKNOWN_COMMAND',{type:command.type});
  const result=handler(state,command,context);
  if(!result||typeof result!=='object'||typeof result.accepted!=='boolean'||!('state'in result)||!Array.isArray(result.events))throw new TypeError(`transition handler ${command.type} returned an invalid TransitionResult`);
  assertSerializableValue(result.state,'dispatch.result.state');
  assertSerializableValue(result.events,'dispatch.result.events');
  if(result.rejection!==null&&typeof result.rejection!=='object')throw new TypeError('TransitionResult.rejection must be null or an object');
  return result;
}
