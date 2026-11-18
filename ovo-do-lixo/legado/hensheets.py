from PIL import Image, ImageDraw, ImageFont
F="/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"
def T(d,xy,t,n,fill="#ffd21a",anchor="mm"): d.text(xy,t,font=ImageFont.truetype(F,n),fill=fill,anchor=anchor,stroke_width=max(3,n//10),stroke_fill="black")
INFO={"penosa":("PENOSA","347 derrotas • dorme com a casca do ovo na cabeça"),"penosaDesperta":("PENOSA DESPERTA","forma do clímax • penas com pontas douradas e raios"),"sombra":("SOMBRA","galinha do Kaio • penas roxas que brilham")}
for k,(t,sub) in INFO.items():
    W=1200; top=170; sh=Image.new("RGB",(W*4,W+top),"#14161c"); d=ImageDraw.Draw(sh)
    T(d,(50,85),t,90,anchor="lm"); d.text((90+ImageDraw.Draw(sh).textlength(t,font=ImageFont.truetype(F,90)),90),sub,font=ImageFont.truetype(F,48),fill="#ddd",anchor="lm")
    for i,v in enumerate(["34","frente","lado","costas"]):
        sh.paste(Image.open(f"henfinal/{k}_{v}.png"),(i*W,top)); T(d,(i*W+W//2,top+W-60),["3/4","FRENTE","LADO","COSTAS"][i],56,fill="#333")
    sh.resize((2000,int((W+top)*2000/(W*4)))).save(f"henfinal/ficha_{k}.png")
im=Image.open("henfinal/trio.png"); d=ImageDraw.Draw(im)
for x,y,t in [(560,1300,"PENOSA"),(1020,1300,"PENOSA DESPERTA"),(1820,1300,"SOMBRA")]: T(d,(x,y),t,60)
im.save("henfinal/galinhas.png")
ref=Image.open("/root/.claude/uploads/5f554778-6f98-544b-9b6f-dbccc413fdf7/00f35d56-image.jpg").convert("RGB").resize((800,800))
mine=Image.open("henfinal/penosa_34.png").convert("RGB").resize((800,800))
c=Image.new("RGB",(1600,880),"#14161c"); c.paste(ref,(0,80)); c.paste(mine,(800,80)); d=ImageDraw.Draw(c)
T(d,(400,40),"REFERÊNCIA",48); T(d,(1200,40),"PENOSA (nossa)",48); c.save("henfinal/comparacao.png")
