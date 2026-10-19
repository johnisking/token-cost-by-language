"""Language of cited pages, checked by hand (URL path, page title in the search results)."""
from urllib.parse import urlparse
PATH_RULES = [("tabelog.com/cn", "zh"), ("tabelog.com/en", "en"), ("tykyiv.com/en", "en"), ("tokyometro.jp/lang_en", "en"), ("tokyometro.jp/en", "en"),
              ("guide.michelin.com/kr/ko", "ko"), ("guide.michelin.com/jp/ja", "ja"), ("guide.michelin.com/us/en", "en"), ("guide.michelin.com/en", "en"),
              ("rfa.org/korean", "ko"), ("news.un.org/en", "en"), ("note.com/yoshi_foodie_jp", "en"), ("timeout.es/madrid/es", "es"),
              ("kiev.vgorode.ua/ukr", "uk"), ("nv.ua/ukr", "uk"), ("kyivmaps.com/en", "en"), ("es.euronews.com", "es"), ("longbridge.com/en", "en"),
              ("tokyoramenoftheyear.com/ja", "ja"),
              # added 2026-10-19 for the local-topic runs 3-5 and Codex local runs
              ("koreaeats.soundedfun.dev/ko", "ko"), ("menufans.com/ko", "ko"), ("timeout.jp/tokyo/ja", "ja"), ("thebettervacation.com/ro", "ro"),
              ("kyivcity.gov.ua/for_foreigners/kyiv_transport", "en"), ("fakty.com.ua/ua", "uk"), ("obozrevatel.com/ukr", "uk"),
              ("tokyoramenoftheyear.com/en", "en"), ("airbnb.com.pa", "unknown")]
HOSTS = {
 "ko": "hotplacehunter.co.kr daily25news.com donga.com elle.co.kr polle.com esquirekorea.co.kr sftc.seoul.go.kr news.mtn.co.kr segye.com 24news.kr yna.co.kr gqkorea.co.kr diningcode.com gukjenews.com cooknchefnews.com news.tf.co.kr monthlyx.com v.daum.net kbthink.com blog.namanecard.com news.seoul.go.kr jab-guyver.co.kr core.asiae.co.kr mt.co.kr wikitree.co.kr biz.sbs.co.kr newspim.com hankookilbo.com sidae.com magazine.hankyung.com allurekorea.com",
 "ja": "hokkaido-np.co.jp pricey.jp url.skr.jp news.web.nhk meiten.reiwaq.com nagoyatv.com news.livedoor.com city.nagoya.jp newsweekjapan.jp advertimes.com shimeblog.com prtimes.jp resemom.jp bestcarweb.jp gourmet.watch.impress.co.jp sbbit.jp train-shiori.com kotsu.metro.tokyo.jp news.tv-asahi.co.jp tokyometro.jp kumanichi.com mod.go.jp jma.go.jp minkabu.jp jiji.com jimin.jp tabelog.com award.tabelog.com ugatech.jp ramendb.supleks.jp nlab.itmedia.co.jp retty.me appbank.net kyodonewsprwire.jp walkerplus.com adrim.co.jp roote.ekispert.net tbladvisory.com ramental.net",
 "zh": "hk01.com etnet.com.hk stheadline.com",
 "es": "elpais.com rtve.es directoalpaladar.com cadenaser.com es.restaurantguru.com ultimahora.es valenciaplaza.com telecinco.es lamoncloa.gob.es articulo14.es lamaletainquieta.com economistjurist.es redtransporte.com metromadrid.es efe.com meteovigo.es as.com malacatin.com labola.es elespanol.com moncloa.com rtvc.es infobae.com periodistadigital.com libertaddigital.com ifema.es gastroactitud.com losviajeros.com neo2.com eldiario.es guiadelocio.es unbuendiaenmadrid.com muchoturismo.com cocidomadrid.com losmejoresdemadrid.com miradormadrid.com comunidad.madrid gacetinmadrid.com crtm.es esdiario.com esmadrid.com hola.com merca2.es lasrecetasdecarol.com",
 "uk": "kyivcity.gov.ua my-kiev.com posteat.ua versal.media epravda.com.ua pro.kyiv.ua grani.kiev.ua ipress.ua ukrinform.ua nashkiev.ua dovidnik.com.ua 44.ua tykyiv.com suspilne.media",
 "pl": "viamichelin.pl",
 "unknown": "yandex.com tokyoramenoftheyear.com",
 "ru": "ru.restaurantguru.com",
 "ro": "",
}
H = {h: l for l, hs in HOSTS.items() for h in hs.split()}

def page_lang(u):
    low = u.lower().split('://', 1)[-1]
    low = low[4:] if low.startswith('www.') else low
    for p, l in PATH_RULES:
        if low.startswith(p): return l
    h = urlparse(u).netloc.lower(); h = h[4:] if h.startswith('www.') else h
    return H.get(h, 'en')
