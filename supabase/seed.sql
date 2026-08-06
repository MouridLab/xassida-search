-- Métadonnées de départ uniquement : elles restent non publiées jusqu'à validation humaine.
insert into public.khassidas(slug,title,arabic_title,aliases,themes,description,is_verified) values
('masaalikul-jinaan','Masaalikul Jinaan','مسالك الجنان',array['Masaalik','Masalikoul Jinaan','Masalik'],array['spiritualité','éducation'],'Œuvre à documenter et faire valider.',false),
('matlaboul-fawzayni','Matlaboul Fawzayni','مطلب الفوزين',array['Matlabul Fawzayni','Matlaboul Fawzaini'],array['prière','Touba'],'Œuvre à documenter et faire valider.',false),
('jazbul-qulub','Jazbul Qulub','جذب القلوب',array['Jazboul Khouloub','Jazboul Qulub'],array['éloge prophétique'],'Œuvre à documenter et faire valider.',false),
('tazawwudush-shubban','Tazawwudush Shubbān','تزود الشبان',array['Tazawwudush Shubban'],array['jeunesse','éducation'],'Œuvre à documenter et faire valider.',false)
on conflict(slug) do nothing;
