from PIL import Image, ImageDraw, ImageFont
F="/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"
def font(n): return ImageFont.truetype(F,n)
def stroke_text(d,xy,t,f,fill="#ffd21a",anchor="mm"):
    d.text(xy,t,font=f,fill=fill,anchor=anchor,stroke_width=max(3,f.size//10),stroke_fill="black")
INFO={
 "menino":("O MENINO","Narrador • achou o ovo no lixo","#3fa34d"),
 "penosa":("PENOSA","347 derrotas • poder: dormir","#9a9a9a"),
 "penosaDesperta":("PENOSA DESPERTA","Forma do clímax • raio dourado","#ffc23a"),
 "sombra":("SOMBRA","Galinha do Kaio • nunca perdeu","#8a2be2"),
 "kaio":("KAIO","Rival • campeão da arena","#5b2a86"),
}
views=[("frente","FRENTE"),("34","3/4"),("lado","LADO"),("costas","COSTAS"),("rosto","ROSTO")]
for k,(title,sub,col) in INFO.items():
    W,H=800,1200; top=190
    sheet=Image.new("RGB",(W*5,H+top),"#14161c"); d=ImageDraw.Draw(sheet)
    d.rectangle([0,0,W*5,14],fill=col)
    stroke_text(d,(60,95),title,font(96),anchor="lm")
    d.text((60+d.textlength(title,font=font(96))+50,100),sub,font=font(52),fill="#e8e8e8",anchor="lm")
    for i,(v,lab) in enumerate(views):
        im=Image.open(f"final/{k}_{v}.png"); sheet.paste(im,(i*W,top))
        stroke_text(d,(i*W+W//2,top+H-60),lab,font(54),fill="#ffffff")
    sheet.resize((2000,int((H+top)*2000/(W*5)))).save(f"final/ficha_{k}.png")
# labeled lineup
im=Image.open("final/lineup.png"); d=ImageDraw.Draw(im)
for x,y,t in [(420,1150,"MENINO"),(770,1150,"PENOSA"),(1120,1150,"PENOSA\nDESPERTA"),(1600,1150,"SOMBRA"),(2120,1150,"KAIO")]:
    d.multiline_text((x,y),t,font=font(56),fill="#ffd21a",anchor="mm",align="center",stroke_width=7,stroke_fill="black")
stroke_text(d,(1280,90),"O OVO DO LIXO",font(120))
im.save("final/elenco.png")
