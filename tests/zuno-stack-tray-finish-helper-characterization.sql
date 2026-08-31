\set ON_ERROR_STOP on

-- Direct characterization of the fourth canonical helper only.
do $$
begin
  if zuno_private.zuno_stack_should_finish_tray('[]'::jsonb) is not false then
    raise exception 'empty tray must not finish';
  end if;
  if zuno_private.zuno_stack_should_finish_tray('["a","b","c","d","e","f"]'::jsonb) is not false then
    raise exception 'six-item tray must not finish';
  end if;
  if zuno_private.zuno_stack_should_finish_tray('["a","b","c","d","e","f","g"]'::jsonb) is not true then
    raise exception 'seven-item tray without trio must finish';
  end if;
  if zuno_private.zuno_stack_should_finish_tray('["a","a","a","b","c","d","e"]'::jsonb) is not false then
    raise exception 'seven-item tray containing trio must not finish';
  end if;
  if zuno_private.zuno_stack_should_finish_tray('["a","b","c","d","e","f","g","h"]'::jsonb) is not true then
    raise exception 'tray above limit without trio must finish';
  end if;
end $$;

select 'zuno_stack_tray_finish_helper_characterization_ok' as result;
