insert into storage.buckets (id, name, public) 
values ('customers_photos', 'customers_photos', true)
on conflict (id) do nothing;

create policy "customers_photos_select_public" 
on storage.objects for select 
to public 
using ( bucket_id = 'customers_photos' );

create policy "customers_photos_insert_auth" 
on storage.objects for insert 
to authenticated 
with check ( bucket_id = 'customers_photos' );

create policy "customers_photos_update_auth" 
on storage.objects for update 
to authenticated 
using ( bucket_id = 'customers_photos' );

create policy "customers_photos_delete_auth" 
on storage.objects for delete 
to authenticated 
using ( bucket_id = 'customers_photos' );
