// validators/auth.validators.js
import { body, validationResult } from 'express-validator';

/* =========================
   Lista de palabras prohibidas (AMPLIADA SIGNIFICATIVAMENTE)
   Se comparan en minúsculas y sin acentos; incluye variantes leetspeak comunes.
========================= */
const BANNED_WORDS = [
  // ========== ESPAÑOL - INSULTOS Y VOCABULARIO EXPLÍCITO ==========
  // Variantes de "puta/puto"
  'puta','puto','put4','pvt4','pvt@','put@','put0','putos','putas','putita','putito',
  'putitas','putitos','putón','putona','put0n','put0n4','pution','putiona',
  'hijaputa','hijoputa','hijaperra','hijodetuputa','hdp','hddp','hijueput4',
  'putisima','putisimo','reputisima','reputisimo','prostituta','prostituto',
  'prost1tut4','prost1tut0','ramera','r4m3r4','furcia','furc14','meretriz',
  
  // Variantes de "pendejo"
  'pendejo','pendeja','pndjo','pndja','pndj','pendjo','pendja','pendejos','pendejas',
  'p3nd3j0','p3nd3j4','pendejada','pendejadas','pendejete','pendejita','pendejito',
  
  // Variantes de "cabrón"
  'cabron','cabrona','cabrón','cabróna','cabrona','cabrn','kbrón','kbr0n','kabron',
  'k4br0n','cabrones','cabronas','cabroncito','cabroncita','recabron','recabrona',
  
  // Variantes de "verga" y derivados de "chingar"
  'verga','vergo','verg4','vrg4','vergon','vergona','vergota','v3rg4','v3rg0t4',
  'chingar','chingada','chingado','chingadera','chingón','chingona','chingao',
  'ch1ng4r','ch1ng4d4','ch1ng0n','chingada madre','chingadazo','chingatumadre',
  'rechingar','rechingada','chingaos','chingones','chinguemos','chingue','chinguen',
  
  // Variantes de "mierda"
  'mierda','mierd4','mierdo','mierdra','m1erda','m1erd4','mierdas','mierdero',
  'mierdera','mierdecita','cagada','cag4d4','cagar','c4g4r','cagon','cagona',
  'cag0n','cag0na','cagado','cagada','mrd','mrda','miercoles',
  
  // Otros insultos comunes
  'imbecil','imbecíl','imbécil','1mb3c1l','1mb3c1l','imbeciles','tarado','tarada',
  't4r4d0','t4r4d4','tarados','taradas','retrasado','retrasada','r3tr4s4d0',
  'subnormal','subn0rm4l','anormal','4n0rm4l','mongolo','mongola','m0ng0l0','m0ng0l4',
  'idiota','1d10t4','idiotas','idiotes','estupido','estúpido','estupida','estúpida',
  '3stup1d0','3stup1d4','estupidez','tonto','tonta','t0nt0','t0nt4','burro','burra',
  'burr0','burr4','inútil','inutiles','1nut1l','fracasado','fracasada','fr4c4s4d0',
  
  // Insultos sexuales
  'marica','maricon','maricón','mar1c4','maric0n','maricones','mariconazo','maricona',
  'joto','jotos','jot0','j0t0','culero','culera','culeros','culeras','cul3r0','cul3r4',
  'puto homosexual','mariquita','mar1qu1t4','mariquitas','mariposa','m4r1p0s4',
  'pargo','p4rg0','come sables','comesables','traga sables','tragasables',
  
  // Términos femeninos despectivos
  'zorra','z0rra','zorras','zorrita','z0rr1t4','perra','p3rra','perras','perritas',
  'puta barata','put4 b4r4t4','ramera','r4m3r4','cualquiera','cu4lqu13r4',
  'facilona','f4c1l0n4','facilota','golfa','g0lf4','golfas','guarra','gu4rr4','guarras',
  
  // Términos sexuales explícitos - partes del cuerpo
  'coño','coños','c0ñ0','c0n0','chocho','ch0ch0','chocha','ch0ch4','concha','c0nch4',
  'cuca','cuc4','papaya','p4p4y4','panochita','pan0ch1t4','vagina','v4g1n4','vaginal',
  'concha tu madre','conchetumadre','ctm','pito','p1t0','pene','p3n3','penis','p3n1s',
  'verga','v3rg4','pija','p1j4','poronga','p0r0ng4','cipote','c1p0t3','bicho','b1ch0',
  'polla','p0ll4','rabo','r4b0','nabo','n4b0','miembro','m13mbr0',
  
  // Términos sexuales - actos
  'follar','f0ll4r','f0llar','follada','f0ll4d4','follador','folladora','follo','follas',
  'cojer','c0j3r','coger','coj3r','cogida','c0g1d4','cogedor','cogedora','cojo','cojes',
  'chingar','ch1ng4r','chingada','ch1ng4d4','tirar','t1r4r','culear','cul34r','culeada',
  'mamar','m4m4r','mamada','m4m4d4','mamadas','mamahuevo','m4m4hu3v0','mamaguevo',
  'chupar','chup4r','chupada','chup4d4','chupame','chup4m3','chupala','chup4l4',
  'lamer','l4m3r','lamida','l4m1d4','lamerla','l4m3rl4',
  
  // Términos sexuales explícitos adicionales
  'sexo','s3x0','s3x','sexual','s3xu4l','sexy','s3xy','porno','p0rn0','pornografia',
  'pornografía','p0rn0gr4f14','pornográfico','porno grafico','xxx','orgasmo','0rg4sm0',
  'masturbar','m4sturb4r','masturbación','m4sturb4c10n','pajero','pajera','p4j3r0','p4j3r4',
  'paja','p4j4','pajas','hacerse la paja','jalarsela','j4l4rs3l4','hacérsela','manuela',
  'm4nu3l4','puñeta','puñetas','puñetero','esperma','3sp3rm4','semen','s3m3n','leche',
  'l3ch3','correrse','c0rr3rs3','venirse','v3n1rs3','acabar','4c4b4r',
  
  // Más partes del cuerpo - vulgar
  'culo','cul0','culito','cul1t0','ojete','0j3t3','ano','4n0','anal','4n4l',
  'bolas','b0l4s','cojones','c0j0n3s','huevos','hu3v0s','testículos','t3st1cul0s',
  'pelotas','p3l0t4s','tetas','t3t4s','pechos','p3ch0s','chichis','ch1ch1s','lolas',
  'l0l4s','melones','m3l0n3s','pezones','p3z0n3s','nene','n3n3','tetamen','t3t4m3n',
  'trasero','tr4s3r0','nalgas','n4lg4s','pompa','p0mp4','pompis','p0mp1s','cachetes',
  'c4ch3t3s','cola','c0l4','colita','c0l1t4','clitoris','cl1t0r1s',
  
  // Actos sexuales más explícitos
  'violar','v10l4r','violada','v10l4d4','violador','v10l4d0r','violacion','v10l4c10n',
  'violación','violada a la fuerza','forzar','f0rz4r','forzada','f0rz4d4',
  'perrito','p3rr1t0','perrita','p3rr1t4','69','sesenta y nueve','s3s3nt4 y nu3v3',
  'misionero','m1s10n3r0','vaquera','v4qu3r4','oral','0r4l','sexo oral','s3x0 0r4l',
  'fellatio','f3ll4t10','cunnilingus','cunn1l1ngus','sodomia','s0d0m14','sodómico',
  
  // Insultos con referencias familiares
  'hijo de puta','h1j0 d3 put4','hijaputa','h1j4put4','hijoperra','h1j0p3rr4',
  'tu madre','tú madre','tu mama','tu vieja','tu jefa','tu hermana','concha tu madre',
  'la concha de tu madre','lcdtm','cdtm','tu papa','tu viejo','tu padre','tu abuelo',
  
  // Variantes de "boludo"
  'boludo','b0lud0','boluda','b0lud4','boludos','boludas','boludez','b0lud3z','boludeces',
  'pelotudo','pelotuda','p3l0tud0','p3l0tud4','huevon','huevona','hu3v0n','hu3v0n4',
  'huevones','huevas','weon','weona','w30n','w30n4',
  
  // Más insultos latinoamericanos
  'pajuo','pajua','p4ju0','conchetumare','conchatumadre','reconcha','rec0nch4',
  'reconchudo','reconchuda','culiado','cul14d0','culiao','cul140','guevon','gu3v0n',
  'güey','guey','gu3y','wey','w3y','pendejete','p3nd3j3t3','menso','mensa','m3ns0',
  'gil','g1l','giles','aweonao','4w30n40','cachudo','c4chud0','cachuda','c4chud4',
  
  // Términos discriminatorios - orientación sexual
  'maricón','m4r1c0n','maricona','m4r1c0n4','maricon','jodito','j0d1t0','jodida',
  'j0d1d4','gay','g4y','homosexual','h0m0s3xu4l','lesbiana','l3sb14n4','tortillera',
  't0rt1ll3r4','machorra','m4ch0rr4','arepera','4r3p3r4','lencha','l3nch4','bollera',
  'b0ll3r4','traga leña','tr4g4 l3ñ4','comemojones','c0m3m0j0n3s',
  
  // Términos discriminatorios - género
  'feminazi','f3m1n4z1','feminazi','hembrista','h3mbr1st4','machista','m4ch1st4',
  'machirulo','m4ch1rul0','misógino','m1s0g1n0','misogino','misándrico','m1s4ndr1c0',
  
  // Términos discriminatorios - raza/etnia
  'sudaca','sud4c4','sudacas','gringo','gr1ng0','gringos','indio','1nd10','indios',
  'indios de mierda','negro','n3gr0','negros','negrata','n3gr4t4','negrito','n3gr1t0',
  'prieto','pr13t0','prietos','moreno','m0r3n0','morenito','chino','ch1n0','chinos',
  'chinito','ch1n1t0','amarillo','4m4r1ll0','amarillos','cucaracha','cuc4r4ch4',
  'espaldamojada','3sp4ld4m0j4d4','indocumentado','1nd0cum3nt4d0','ilegal','1l3g4l',
  'paisano','p41s4n0','nacos','n4c0s','zurdo','zurd0','facho','f4ch0',
  
  // ========== INGLÉS - INSULTOS Y TÉRMINOS EXPLÍCITOS ==========
  // Variantes de "fuck"
  'fuck','fucked','fucker','fuckers','fuckin','fucking','fuckface','fuckhead','fuckwit',
  'motherfucker','motherfuck','m0th3rfuck3r','muthafucka','mofo','m0f0','fuk','fck',
  'f4ck','f*ck','f_ck','fvck','phuck','phuk','fukk','fook','fuk','fucka','fuckboy',
  'fuckgirl','unfuckable','clusterfuck','mindfuck','brainfuck','buttfuck','buttfucker',
  
  // Variantes de "bitch"
  'bitch','bitches','bitchy','bitchin','b1tch','b!tch','b1tch3s','biatch','biitch',
  'beatch','beotch','biotch','b*tch','son of a bitch','sonofabitch','sob','little bitch',
  'basic bitch','badbitches','bitchass','bitchface','bitchboy',
  
  // Variantes de "asshole"
  'asshole','assholes','assho','assh0le','4ssh0l3','a$$hole','ahole','a-hole','butthole',
  'arsehole','4rs3h0l3','arse','4rs3','ass','4ss','asses','dumbass','dumb4ss','jackass',
  'j4ck4ss','fatass','f4t4ss','smartass','sm4rt4ss','badass','b4d4ss','kissass','k1ss4ss',
  'asshat','4ssh4t','asswipe','4ssw1p3','assfuck','4ssf*ck','asslick','asslicker',
  
  // Variantes de "shit"
  'shit','shitty','shits','shitting','shitted','sh1t','sh!t','sh*t','sht','shite','sh1te',
  'shyt','shiit','shiiit','bullshit','bull sh1t','horseshit','h0rs3sh1t','dogshit',
  'd0gsh1t','batshit','b4tsh1t','apeshit','4p3sh1t','shithead','sh1th34d','shitface',
  'sh1tf4c3','shitshow','sh1tsh0w','shithole','sh1th0l3','dipshit','d1psh1t','chickenshit',
  
  // Variantes de "cunt"
  'cunt','cunts','c*nt','cvnt','kunt','kunt','cnut','c u n t','c.u.n.t','cunty',
  'cuntface','cuntbag','thunder cunt','stupid cunt','dumb cunt',
  
  // Otros insultos comunes
  'whore','wh0r3','whores','wh0r3s','slut','sluts','slutty','sl*t','sl_t','slvt','sluut',
  'sloot','skank','sk4nk','skanks','skankwhore','ho','hoe','hoes','hoebag','hooker',
  'h00k3r','hookers','tramp','tr4mp','tramps','harlot','h4rl0t',
  
  // Términos sexuales en inglés
  'dick','dicks','d**k','d1ck','d!ck','dik','dck','dickhead','d1ckh34d','dickface',
  'd1ckf4c3','cock','cocks','c0ck','c0cks','c*ck','cok','cawk','cocksucker','c0cksuck3r',
  'cocksuckers','cockhead','c0ckh34d','pussy','pussies','puss1','p*ssy','p*ss1','pussi',
  'poosie','coochie','c00ch13','vagina','v4g1n4','pussy cat','twat','tw4t','tw@t','minge',
  'm1ng3','gash','g4sh','snatch','sn4tch','beaver','b34v3r','clam','cl4m',
  
  // Más términos sexuales explícitos
  'penis','p3n1s','dong','d0ng','schlong','schl0ng','johnson','j0hns0n','wiener','w13n3r',
  'prick','pr1ck','tool','t00l','rod','r0d','member','m3mb3r','shaft','sh4ft','balls',
  'b4lls','ballsack','b4lls4ck','nuts','nut sack','nutsack','scrotum','scr0tum','testes',
  't3st3s','testicles','t3st1cl3s','tits','titties','t1ts','t1tt13s','boobs','b00bs',
  'boobies','b00b13s','breasts','br34sts','jugs','juggs','knockers','kn0ck3rs','hooters',
  'h00t3rs','melons','m3l0ns','rack','r4ck','nipples','n1ppl3s','areola','4r30l4',
  
  // Actos sexuales en inglés
  'blowjob','bl0wj0b','blow job','bl0w j0b','bj','fellatio','f3ll4t10','suck dick',
  'handjob','h4ndj0b','hand job','h4nd j0b','hj','fingering','f1ng3r1ng','fisting',
  'f1st1ng','anal','4n4l','butt sex','buttf*ck','rimjob','r1mj0b','rim job','r1m j0b',
  'cunnilingus','cunn1l1ngus','eat out','34t 0ut','muff dive','m*ff d1v3','scissoring',
  'scissor','sc1ss0r','tribbing','tr1bb1ng','69','sixty nine','s1xty n1n3','doggy style',
  'd0ggy styl3','doggystyle','missionary','m1ss10n4ry','cowgirl','c0wg1rl','reverse cowgirl',
  'creampie','cr34mp13','bukakke','buk4kk3','gangbang','g4ngb4ng','gang bang','g4ng b4ng',
  'orgy','0rgy','threesome','thr33s0m3','foursome','f0urs0m3','train','tr41n',
  
  // Más actos sexuales
  'cum','cumming','cumshot','c*m','c_m','cvm','kum','jizz','j1zz','jizm','splooge',
  'spl00g3','spunk','sp*nk','load','l04d','nut','nutted','sperm','sp3rm','semen','s3m3n',
  'ejaculate','3j4cul4t3','orgasm','0rg4sm','climax','cl1m4x','squirt','squ1rt','wet',
  'w3t','horny','h0rny','aroused','4r0us3d','hard','h4rd','erect','3r3ct','boner','b0n3r',
  'hardon','h4rd0n','hard-on','stiffy','st1ffy','chubby','chubby','woody','w00dy',
  
  // Masturbación
  'masturbate','m4sturb4t3','masturbation','m4sturb4t10n','jerk off','j3rk 0ff','jack off',
  'j4ck 0ff','wank','w4nk','wanker','w4nk3r','wanking','w4nk1ng','beating off','b34t1ng 0ff',
  'stroke','str0k3','stroking','str0k1ng','rub','rubb1ng','rubbing one out','rubb1ng 0n3 0ut',
  'touching yourself','t0uch1ng y0urs3lf','playing with yourself','pl4y1ng w1th y0urs3lf',
  
  // Pornografía
  'porn','porno','p0rn','p0rn0','p*rn','pr0n','pr0no','pornography','p0rn0gr4phy',
  'pornographic','p0rn0gr4ph1c','xxx','x rated','x-rated','xxx rated','adult film',
  '4dult f1lm','sex tape','s3x t4p3','nude','nudes','n*de','n*des','naked','n4k3d',
  'nudity','nud1ty','strip','str1p','stripping','str1pp1ng','stripper','str1pp3r',
  'striptease','str1pt34s3','lap dance','l4p d4nc3','lapdance','l4pd4nc3',
  
  // Variantes de slurs raciales
  'nigger','nigga','n*gger','n*gga','n1gger','n1gga','nig','nigg','niglet','n1gl3t',
  'negro','n3gr0','coon','c00n','jigaboo','j1g4b00','spook','sp00k','darky','d4rky',
  'kaffir','k4ff1r','chink','ch1nk','chinky','ch1nky','gook','g00k','zipperhead',
  'z1pp3rh34d','slant','sl4nt','nip','n1p','jap','j4p','spic','sp1c','spick','sp1ck',
  'beaner','b34n3r','wetback','w3tb4ck','greaser','gr34s3r','kike','k1k3','hymie','hym13',
  'heeb','h33b','yid','y1d','towelhead','t0w3lh34d','sand nigger','s4nd n1gg3r','camel jockey',
  'c4m3l j0ck3y','raghead','r4gh34d','dune coon','dun3 c00n','curry muncher','curry m*nch3r',
  'paki','p4k1','dothead','d0th34d','cracker','cr4ck3r','honky','h0nky','whitey','wh1t3y',
  'redneck','r3dn3ck','hillbilly','h1llb1lly','trailer trash','tr41l3r tr4sh','white trash',
  'wh1t3 tr4sh','gringo','gr1ng0','savage','s4v4g3','redskin','r3dsk1n','injun','1njun',
  
  // Slurs sobre orientación sexual
  'fag','faggot','f*ggot','fagg0t','f4g','f4gg0t','fgt','poof','p00f','poofter','p00ft3r',
  'queer','qu33r','fairy','f41ry','sissy','s1ssy','pansy','p4nsy','homo','h0m0','dyke',
  'd1k3','d*ke','lesbo','l3sb0','lezzy','l3zzy','carpet muncher','c4rp3t m*nch3r',
  'muff diver','m*ff d1v3r','pillow biter','p1ll0w b1t3r','fudgepacker','f*dg3p4ck3r',
  'butt pirate','b*tt p1r4t3','rump ranger','r*mp r4ng3r','ass bandit','4ss b4nd1t',
  
  // Slurs sobre género y trans
  'tranny','tr4nny','trannies','shemale','sh3m4l3','heshe','h3sh3','ladyboy','l4dyb0y',
  'chick with dick','ch1ck w1th d1ck','dickgirl','d1ckg1rl','trap','tr4p','transvestite',
  'tr4nsv3st1t3','cross dresser','cr0ss dr3ss3r','she male','sh3 m4l3',
  
  // Insultos sobre inteligencia/salud mental
  'retard','retarded','r3t4rd','r3t4rd3d','tard','t4rd','mental','m3nt4l','psycho','psych0',
  'crazy','cr4zy','insane','1ns4n3','nuts','nutjob','n*tj0b','nutcase','n*tc4s3','lunatic',
  'lun4t1c','maniac','m4n14c','demented','d3m3nt3d','deranged','d3r4ng3d','schizo','sch1z0',
  'autistic','4ut1st1c','sperg','sp3rg','asperger','4sp3rg3r','downie','d0wn13','mongoloid',
  'm0ng0l01d','cretin','cr3t1n','imbecile','1mb3c1l3','moron','m0r0n','idiot','1d10t',
  
  // Palabras sobre discapacidad usadas como insultos
  'cripple','cr1ppl3','gimp','g1mp','vegetable','v3g3t4bl3','invalid','1nv4l1d','wheelchair',
  'wh33lch41r','handicap','h4nd1c4p','dumb','d*mb','deaf','d34f','blind','bl1nd','lame','l4m3',
  
  // Términos violentos/amenazantes
  'kill','k1ll','killing','k1ll1ng','murder','m*rd3r','murderer','m*rd3r3r','rape','r4p3',
  'rapist','r4p1st','molest','m0l3st','molester','m0l3st3r','abuse','4bus3','abuser','4bus3r',
  'torture','t0rtur3','beat','b34t','beating','b34t1ng','stab','st4b','shoot','sh00t',
  'shooting','sh00t1ng','gun','gvn','bullet','bull3t','knife','kn1f3','blade','bl4d3',
  'weapon','w34p0n','blood','bl00d','die','d13','death','d34th','dead','d34d','corpse',
  'c0rps3','suicide','su1c1d3','hang','h4ng','hanging','h4ng1ng','overdose','0v3rd0s3',
  
  // ========== VARIANTES LEETSPEAK ADICIONALES ==========
  'f**k','f***','f_u_c_k','f.u.c.k','b**ch','b***h','sh**','sh*t','c**t','d**k',
  'p***y','a**','a**hole','wh*re','sl*t','f*g','f*ggot','n*gger','n*gga','c*ck',
  'd1ckh34d','fvck3r','fvck1ng','sh1tty','4ssh0l3','bitchy','fuckboi','fuckgirl',
  
  // ========== TÉRMINOS DE INYECCIÓN Y SEGURIDAD ==========
  'admin','administrator','root','superuser','systemadmin','sysadmin','moderator',
  'mod','exec','execute','eval','system','cmd','command','shell','bash','powershell',
  'javascript','<script','</script','script>','onerror','onload','onclick','onmouseover',
  'document.','window.','alert(','prompt(','confirm(','console.','eval(','function(',
  'setTimeout','setInterval','innerHTML','outerHTML','<iframe','</iframe','iframe>',
  '<embed','<object','<frame','<frameset','xss','injection','sqli','sql injection',
  'union select','drop table','delete from','insert into','update set','truncate',
  '1=1','1=1--','or 1=1','admin\'--','\' or \'1\'=\'1','--','/*','*/','../../',
  '../','||','&&','||=','&&=','null','undefined','constructor','prototype','__proto__',
  'exec','xp_','sp_','sys.','information_schema','schema','grant','revoke','alter table',
  'create table','drop database','create database','backup','restore','waitfor','sleep',
  'benchmark','load_file','into outfile','into dumpfile','char(','concat(','group_concat(',
  'substring(','ascii(','hex(','unhex(','convert(','cast(','@@version','current_user',
  'database()','user()','version()','connection_id()','last_insert_id()','row_count()',
  'mongodb','nosql','$where','$gt','$lt','$ne','$regex','$exists','$in','$nin',
  '.find(','.insert(','.update(','.delete(','.drop(','.remove(','.exec(','.shell(',
  'require(','import(','process.','child_process','fs.readfile','fs.writefile',
  'buffer.alloc','crypto.','express','mongoose','sequelize','knex','typeorm',
  
  // ========== EVASIÓN DE FILTROS ==========
  'test123','admin123','user123','password123','qwerty','12345','123456','1234567',
  'aaaa','bbbb','xxxx','zzzz','0000','1111','9999','!!!','???','...',
  'bypass','evasion','workaround','exploit','vulnerability','vuln','0day','zero day',
  'payload','malware','virus','trojan','ransomware','keylogger','backdoor','rootkit',
  'botnet','ddos','dos','phishing','spoof','scam','fraud','hack','hacker','hacking',
  'cracker','cracking','warez','keygen','crack','serial','nulled','pirate','piracy',
];

// Set para búsquedas rápidas
const BANNED_SET = new Set(BANNED_WORDS.map(n => normalize(n)));

// Modo estricto para email
const STRICT_EMAIL_SUBSTRING = true;

/* =========================
   Helpers de normalización y chequeos MEJORADOS
========================= */
function normalize(str) {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

// Detecta y normaliza leetspeak (AMPLIADO)
function leetNormalize(s) {
  return String(s)
    .replace(/@/g, 'a')
    .replace(/4/g, 'a')
    .replace(/3/g, 'e')
    .replace(/1|!|\|/g, 'i')
    .replace(/0/g, 'o')
    .replace(/\$|5/g, 's')
    .replace(/7|\+/g, 't')
    .replace(/2/g, 'z')
    .replace(/6/g, 'g')
    .replace(/8/g, 'b')
    .replace(/9/g, 'g')
    .replace(/\*/g, '')
    .replace(/_/g, '')
    .replace(/-/g, '')
    .replace(/\./g, '')
    .replace(/\[/g, '')
    .replace(/\]/g, '')
    .replace(/\(/g, '')
    .replace(/\)/g, '')
    .replace(/\{/g, '')
    .replace(/\}/g, '');
}

// Detecta caracteres de control / null bytes
function hasControlChars(s) {
  return /[\x00-\x1F\x7F]/.test(s);
}

// Detecta tags HTML, entidades y scripts (MEJORADO)
function hasHtmlTagsOrScripts(s) {
  const normalized = s.toLowerCase();
  if (/<[^>]+>/.test(s)) return true;
  if (/(&lt;|&gt;|&quot;|&#x|&#0|&amp;|&apos;|&#39;)/.test(normalize(s))) return true;
  if (/(<script|<\/script|javascript:|data:|vbscript:|onerror=|onload=|onclick=|onmouseover=|onmouseenter=|onmouseleave=|onfocus=|onblur=|onchange=|onsubmit=|eval\(|alert\(|prompt\(|confirm\(|document\.|window\.|location\.|cookie|localstorage|sessionstorage)/.test(normalized)) return true;
  if (/(src=|href=|action=|formaction=|data=|xmlns=|style=|background=)/.test(normalized)) return true;
  return false;
}

// Detecta tokens SQL y NoSQL comunes (AMPLIADO)
const SQL_TOKENS = new Set([
  'select','insert','update','delete','drop','union','alter','create','truncate',
  'table','database','schema','grant','revoke','execute','exec','xp_','sp_','sys',
  'information_schema','where','from','set','values','into','join','having','group',
  'order','by','like','null','cast','convert','char','concat','substring','ascii',
  'hex','unhex','load_file','outfile','dumpfile','waitfor','sleep','benchmark',
  'version','user','current_user','session_user','system_user','connection_id',
  'last_insert_id','row_count','found_rows','password','admin','root','username',
  'mongodb','nosql','$where','$gt','$lt','$ne','$eq','$in','$nin','$regex',
  '$exists','$all','$size','$type','$mod','$text','$search','$elemMatch',
  '.find','.insert','.update','.delete','.drop','.remove','.exec','.shell',
  'require','import','process','child_process','fs.readfile','fs.writefile',
  'eval','function','constructor','prototype','__proto__','settimeout','setinterval',
]);

function hasSuspiciousSQLTokens(s) {
  const tokens = normalize(leetNormalize(s)).split(/[^a-z0-9]+/).filter(Boolean);
  return tokens.some(t => SQL_TOKENS.has(t));
}

// Detecta palabras prohibidas en email (modo estricto - substring)
function emailHasBannedStrict(email) {
  const s = leetNormalize(normalize(email));
  return BANNED_WORDS.some(b => s.includes(normalize(b)));
}

// Detecta palabras prohibidas por token (MEJORADO)
function textHasBannedByToken(text) {
  const s = leetNormalize(normalize(text));
  const tokens = s.split(/[^a-z0-9]+/).filter(Boolean);
  
  // Verificar tokens individuales
  if (tokens.some(tok => BANNED_SET.has(tok))) return true;
  
  // Verificar combinaciones de tokens (evasión con espacios)
  for (let i = 0; i < tokens.length - 1; i++) {
    const combined = tokens[i] + tokens[i + 1];
    if (BANNED_SET.has(combined)) return true;
  }
  
  // Verificar combinaciones de 3 tokens
  for (let i = 0; i < tokens.length - 2; i++) {
    const combined = tokens[i] + tokens[i + 1] + tokens[i + 2];
    if (BANNED_SET.has(combined)) return true;
  }
  
  return false;
}

// Detección de patrones de evasión (AMPLIADA)
function hasEvasionPatterns(text) {
  const patterns = [
    /(.)\1{3,}/,                           // caracteres repetidos 4+ veces
    /[aeiou]{6,}/i,                        // muchas vocales seguidas
    /[^aeiou\s]{7,}/i,                     // muchas consonantes seguidas
    /\b[a-z]{1,2}[0-9]{3,}[a-z]{0,2}\b/i, // patrón usuario generado (ab123, x999z)
    /\b[0-9]{4,}\b/,                       // números largos solos
    /_{3,}|-{3,}|\.{3,}/,                  // símbolos repetidos
    /[^\w\s@.-]{3,}/,                      // símbolos especiales consecutivos
    /\s{3,}/,                              // espacios múltiples
    /^[^a-z]*$/i,                          // sin letras
    /^[0-9@._-]+$/,                        // solo números y símbolos
  ];
  
  return patterns.some(pattern => pattern.test(text));
}

// Detección de patrones de inyección avanzados (NUEVO)
function hasAdvancedInjectionPatterns(text) {
  const patterns = [
    // SQL Injection
    /(\bor\b|\band\b)\s*['"]?\s*\d+\s*['"]?\s*=\s*['"]?\s*\d+/i,
    /\bunion\b.*\bselect\b/i,
    /\bdrop\b.*\btable\b/i,
    /\bexec\b.*\(/i,
    /';.*--|\/\*|\*\//,
    /\bxp_cmdshell\b/i,
    
    // XSS
    /<script[^>]*>.*<\/script>/i,
    /javascript:\s*\w+/i,
    /on\w+\s*=\s*['"][^'"]*['"]/i,
    /<iframe[^>]*>/i,
    /document\.\w+/i,
    
    // Path Traversal
    /\.\.[\/\\]/,
    /\.\.%2[fF]/,
    /\.\.%5[cC]/,
    
    // Command Injection
    /[;&|`$()]/,
    /\b(cat|ls|rm|wget|curl|nc|netcat|bash|sh|cmd|powershell)\b/i,
    
    // NoSQL Injection
    /\$\w+\s*:/,
    /\{\s*['"]?\$\w+['"]?\s*:/,
    
    // LDAP Injection
    /[()&|*]/,
    
    // Template Injection
    /\{\{.*\}\}/,
    /\$\{.*\}/,
    /%\{.*\}/,
  ];
  
  return patterns.some(pattern => pattern.test(text));
}

// Validación estricta de nombre humano (MEJORADA)
function isHumanNameStrict(name) {
  if (typeof name !== 'string') return false;
  const raw = name.trim();
  
  // Longitud razonable
  if (raw.length < 2 || raw.length > 120) return false;

  // Solo letras, espacios, apóstrofe y guion
  const allowed = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' -]+$/u;
  if (!allowed.test(raw)) return false;

  // Al menos dos palabras de 2+ caracteres
  const words = raw.split(/\s+/).filter(w => w.length >= 2);
  if (words.length < 2) return false;

  // No debe comenzar o terminar con símbolos
  if (/^[' -]|[' -]$/.test(raw)) return false;

  // No debe tener símbolos repetidos
  if (/[']{2,}|[-]{2,}|\s{2,}/.test(raw)) return false;

  // Chequeo de palabras prohibidas
  if (textHasBannedByToken(raw)) return false;

  // Patrones de evasión
  if (hasEvasionPatterns(raw)) return false;

  // Control chars y tags
  if (hasControlChars(raw) || hasHtmlTagsOrScripts(raw)) return false;

  // Inyección avanzada
  if (hasAdvancedInjectionPatterns(raw)) return false;

  return true;
}

/* =========================
   Validadores del registro (MEJORADOS)
========================= */
export const registerValidator = [
  body('email')
    .isEmail().withMessage('email inválido')
    .bail()
    .custom((value) => {
      if (typeof value !== 'string') throw new Error('email inválido');

      // Control chars / null bytes
      if (hasControlChars(value)) {
        throw new Error('email contiene caracteres inválidos');
      }

      // Tags HTML / scripts
      if (hasHtmlTagsOrScripts(value)) {
        throw new Error('email contiene contenido no permitido');
      }

      // Tokens SQL sospechosos
      if (hasSuspiciousSQLTokens(value)) {
        throw new Error('email contiene contenido no permitido');
      }

      // Patrones de evasión
      if (hasEvasionPatterns(value)) {
        throw new Error('email contiene patrones sospechosos');
      }

      // Inyección avanzada
      if (hasAdvancedInjectionPatterns(value)) {
        throw new Error('email contiene patrones de inyección');
      }

      // Palabras prohibidas (modo estricto)
      if (STRICT_EMAIL_SUBSTRING) {
        if (emailHasBannedStrict(value)) {
          throw new Error('email contiene términos no permitidos');
        }
      } else {
        if (textHasBannedByToken(value)) {
          throw new Error('email contiene términos no permitidos');
        }
      }

      // Límite razonable
      if (value.length > 254) throw new Error('email demasiado largo');

      // Validación adicional del formato
      const parts = value.split('@');
      if (parts.length !== 2) throw new Error('email inválido');
      if (parts[0].length === 0 || parts[1].length < 3) throw new Error('email inválido');
      if (!parts[1].includes('.')) throw new Error('email inválido');

      return true;
    }),

  body('password')
    .isString().withMessage('password debe ser string')
    .isLength({ min: 8 }).withMessage('password mínimo 8 caracteres')
    .bail()
    .custom((value) => {
      if (hasControlChars(value)) {
        throw new Error('password contiene caracteres inválidos');
      }
      if (hasHtmlTagsOrScripts(value)) {
        throw new Error('password contiene contenido no permitido');
      }
      if (textHasBannedByToken(value)) {
        throw new Error('password contiene términos no permitidos');
      }
      if (hasAdvancedInjectionPatterns(value)) {
        throw new Error('password contiene patrones de inyección');
      }
      return true;
    }),

  body('displayName')
    .exists({ checkFalsy: true }).withMessage('displayName requerido')
    .bail()
    .isLength({ min: 2, max: 120 }).withMessage('displayName debe tener entre 2 y 120 caracteres')
    .bail()
    .custom((value) => {
      if (!isHumanNameStrict(value)) {
        throw new Error(
          'displayName debe ser un nombre real: solo letras (incluye acentos/ñ/ü), ' +
          'espacios, apóstrofe y guion; al menos 2 palabras de 2+ caracteres cada una; ' +
          'sin palabras ofensivas ni contenido malicioso'
        );
      }
      return true;
    }),

  handleValidationErrors,
];

export const loginValidator = [
  body('email').isEmail().withMessage('email inválido'),
  body('password').isString().isLength({ min: 6 }).withMessage('password min 6'),
  handleValidationErrors,
];

export function handleValidationErrors(req, res, next) {
  const r = validationResult(req);
  if (r.isEmpty()) return next();
  return res.status(422).json({
    error: {
      code: 'VALIDATION_ERROR',
      fields: r.array().map(e => ({ field: e.path, message: e.msg })),
    },
  });
}