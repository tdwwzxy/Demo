package local.research;

import org.springframework.stereotype.Component;
import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.geom.*;
import java.awt.image.BufferedImage;
import java.io.*;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Locale;
import local.research.MarketData.Point;
import static local.research.MarketData.*;

@Component
public class ChartRenderer {
    public static final int WIDTH=4883,HEIGHT=2900;
    private static final Color RED=new Color(174,29,26), INK=new Color(30,35,41), MUTED=new Color(102,111,122);
    record Panel(double x,double y,double w,double h,LocalDate from,LocalDate to,double min,double max) {
        double px(LocalDate d){return x+w*ChronoUnit.DAYS.between(from,d)/ChronoUnit.DAYS.between(from,to);}
        double py(double n){return y+h*(max-n)/(max-min);}
    }
    public byte[] render(List<Point> all,Instant generatedAt) throws IOException {
        if(all.isEmpty())throw new IllegalArgumentException("Nothing to render");
        Point latest=all.getLast();
        LocalDate start=LocalDate.of(latest.date().getYear()-2,1,1);
        if(start.isBefore(all.getFirst().date()))start=all.getFirst().date();
        LocalDate end=LocalDate.of(latest.date().getYear()+1,1,1);
        LocalDate begin=start;
        List<Point> visible=all.stream().filter(p->!p.date().isBefore(begin)).toList();
        double min=Math.min(.90,Math.floor(visible.stream().mapToDouble(Point::normalizedLow).min().orElse(.9)*100)/100);
        double max=Math.max(1.10,Math.ceil(visible.stream().mapToDouble(Point::normalizedHigh).max().orElse(1.1)*100)/100);
        BufferedImage image=new BufferedImage(WIDTH,HEIGHT,BufferedImage.TYPE_INT_RGB);
        Graphics2D g=image.createGraphics();
        g.scale(WIDTH/2048.0,HEIGHT/1216.0);
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING,RenderingHints.VALUE_ANTIALIAS_ON);
        g.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING,RenderingHints.VALUE_TEXT_ANTIALIAS_ON);
        g.setColor(Color.WHITE);g.fillRect(0,0,2048,1216);
        text(g,"10yr T-Note Futures Price",178,84,new Font("Georgia",Font.BOLD,46),new Color(155,53,5));
        text(g,"Normalized to its 3yr MA",178,135,new Font("Georgia",Font.BOLD,35),INK);
        text(g,latest.date().format(DateTimeFormatter.ofPattern("MMM dd, yyyy",Locale.US)),180,171,new Font("Georgia",Font.ITALIC,23),MUTED);
        text(g,"TREASURY / RESEARCH",1430,86,new Font("SansSerif",Font.BOLD,30),new Color(159,108,16));
        text(g,"LOCAL DATA REPORT",1550,126,new Font("SansSerif",Font.BOLD,24),MUTED);
        text(g,"Futu US.ZNmain  |  Daily close / 756-session SMA",1350,163,new Font("SansSerif",Font.PLAIN,20),MUTED);
        g.setColor(new Color(210,214,217));g.setStroke(new BasicStroke(1));g.draw(new Line2D.Double(135,188,1940,188));
        Panel main=new Panel(180,226,1680,828,start,end,min,max);
        drawPanel(g,main,visible,.05,3,false);
        for(Band b:BANDS) {
            text(g,String.format(Locale.US,"%.3f (+/- %s) relative to the 3yr MA",b.center(),Double.toString(b.halfWidth())),
                    b.center()>1.04?1430:1080,main.py(b.center())+7,new Font("SansSerif",Font.PLAIN,18),RED);
        }
        g.setColor(RED);g.setStroke(new BasicStroke(2));g.draw(new Line2D.Double(1080,318,1120,318));
        text(g,"ZN normalized to 3yr MA",1130,324,new Font("SansSerif",Font.PLAIN,19),INK);
        g.setColor(new Color(191,73,70,65));g.fill(new Rectangle2D.Double(1080,341,40,12));
        text(g,"Daily high / low normalized to the same MA",1130,353,new Font("SansSerif",Font.PLAIN,18),MUTED);
        double lx=main.px(latest.date()),ly=main.py(latest.normalized());
        g.setColor(RED);g.fill(new Ellipse2D.Double(lx-4,ly-4,8,8));
        text(g,String.format(Locale.US,"%.5f",latest.normalized()),lx+15,ly+7,new Font("SansSerif",Font.BOLD,20),RED);

        // The inset reuses the computed main series; it does not recalculate the SMA.
        LocalDate insetStart=latest.date().minusMonths(6);
        List<Point> recent=all.stream().filter(p->!p.date().isBefore(insetStart)).toList();
        double rmin=Math.floor(recent.stream().mapToDouble(Point::normalizedLow).min().orElse(.95)*200)/200-.005;
        double rmax=Math.ceil(recent.stream().mapToDouble(Point::normalizedHigh).max().orElse(1)*100)/100+.005;
        g.setColor(Color.WHITE);g.fill(new Rectangle2D.Double(207,206,651,410));
        g.setColor(INK);g.setStroke(new BasicStroke(2.5f));g.draw(new Rectangle2D.Double(207,206,651,410));
        Panel inset=new Panel(281,250,505,303,insetStart,latest.date().plusDays(45),rmin,rmax);
        drawPanel(g,inset,recent,.01,2,true);
        text(g,"RECENT DETAIL",635,235,new Font("SansSerif",Font.BOLD,14),MUTED);
        for(Band b:BANDS) if(b.center()>rmin&&b.center()<rmax)
            text(g,String.format(Locale.US,"%.3f +/- %s",b.center(),Double.toString(b.halfWidth())),
                    465,inset.py(b.center())+5,new Font("SansSerif",Font.PLAIN,13),RED);
        text(g,"Date",510,600,new Font("SansSerif",Font.PLAIN,14),INK);
        text(g,"Date",986,1140,new Font("SansSerif",Font.PLAIN,25),INK);
        text(g,"Source: Futu MCP  |  autype=0  |  Bands transcribed from reference chart; method reconstruction",
                180,1180,new Font("SansSerif",Font.PLAIN,16),MUTED);
        String stamp="Generated "+generatedAt.atZone(ZoneOffset.UTC).format(DateTimeFormatter.ofPattern("uuuu-MM-dd HH:mm 'UTC'"));
        text(g,stamp,1475,1180,new Font("SansSerif",Font.PLAIN,16),MUTED);
        g.dispose();
        ByteArrayOutputStream bytes=new ByteArrayOutputStream();
        ImageIO.write(image,"png",bytes);
        return bytes.toByteArray();
    }
    private void drawPanel(Graphics2D g,Panel p,List<Point> points,double yStep,int monthStep,boolean small) {
        int fs=small?13:23;
        for(Band b:BANDS) {
            double top=Math.max(p.y(),p.py(b.upper())),bottom=Math.min(p.y()+p.h(),p.py(b.lower()));
            if(bottom>top){g.setColor(new Color(252,240,240));g.fill(new Rectangle2D.Double(p.x(),top,p.w(),bottom-top));}
        }
        g.setStroke(new BasicStroke(.7f,BasicStroke.CAP_BUTT,BasicStroke.JOIN_MITER,10,new float[]{4,4},0));
        for(double v=Math.ceil(p.min()/.01)*.01;v<=p.max()+.000001;v+=.01){
            double yy=p.py(v);g.setColor(new Color(220,224,227));g.draw(new Line2D.Double(p.x(),yy,p.x()+p.w(),yy));
        }
        LocalDate tick=p.from().withDayOfMonth(1);
        while(tick.isBefore(p.from()))tick=tick.plusMonths(1);
        while((tick.getMonthValue()-1)%monthStep!=0)tick=tick.plusMonths(1);
        for(LocalDate d=tick;!d.isAfter(p.to());d=d.plusMonths(monthStep)){
            double xx=p.px(d);g.setColor(new Color(220,224,227));g.draw(new Line2D.Double(xx,p.y(),xx,p.y()+p.h()));
        }
        Shape clip=g.getClip();g.clip(new Rectangle2D.Double(p.x(),p.y(),p.w(),p.h()));
        Path2D envelope=new Path2D.Double();boolean first=true;
        for(Point point:points){if(first){envelope.moveTo(p.px(point.date()),p.py(point.normalizedHigh()));first=false;}
            else envelope.lineTo(p.px(point.date()),p.py(point.normalizedHigh()));}
        for(Point point:points.reversed())envelope.lineTo(p.px(point.date()),p.py(point.normalizedLow()));
        envelope.closePath();g.setColor(new Color(191,73,70,75));g.fill(envelope);
        Path2D line=new Path2D.Double();first=true;
        for(Point point:points){if(first){line.moveTo(p.px(point.date()),p.py(point.normalized()));first=false;}
            else line.lineTo(p.px(point.date()),p.py(point.normalized()));}
        g.setColor(RED);g.setStroke(new BasicStroke(small?1.6f:1.7f));g.draw(line);g.setClip(clip);
        g.setColor(INK);g.setStroke(new BasicStroke(small?2:3));g.draw(new Rectangle2D.Double(p.x(),p.y(),p.w(),p.h()));
        for(double v=Math.ceil(p.min()/yStep)*yStep;v<=p.max()+.000001;v+=yStep){
            double yy=p.py(v);g.setColor(INK);
            g.draw(new Line2D.Double(p.x()-15,yy,p.x(),yy));g.draw(new Line2D.Double(p.x()+p.w(),yy,p.x()+p.w()+15,yy));
            text(g,String.format(Locale.US,"%.2f",v),p.x()-(small?52:85),yy+fs*.35,new Font("SansSerif",Font.PLAIN,fs),INK);
            text(g,String.format(Locale.US,"%.2f",v),p.x()+p.w()+24,yy+fs*.35,new Font("SansSerif",Font.PLAIN,fs),INK);
        }
        for(LocalDate d=tick;!d.isAfter(p.to());d=d.plusMonths(monthStep)){
            double xx=p.px(d);g.setColor(INK);g.draw(new Line2D.Double(xx,p.y()+p.h(),xx,p.y()+p.h()+15));
            String label=small?d.format(DateTimeFormatter.ofPattern("M/uuuu")):d.format(DateTimeFormatter.ofPattern("M/d/uuuu"));
            text(g,label,xx-(small?24:48),p.y()+p.h()+(small?37:58),new Font("SansSerif",Font.PLAIN,fs),INK);
        }
    }
    private static void text(Graphics2D g,String s,double x,double y,Font f,Color c){
        g.setFont(f);g.setColor(c);g.drawString(s,(float)x,(float)y);
    }
}
