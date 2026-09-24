package local.research;

import java.time.LocalDate;
import java.util.*;

public final class MarketData {
    private MarketData() {}
    public static final int WINDOW = 756;
    public record Bar(LocalDate date, double open, double high, double low, double close,
                      Double settle, long volume, long openInterest) {}
    public record Point(LocalDate date, double open, double high, double low, double close,
                        Double settle, long volume, long openInterest, Double ma3y,
                        Double normalized, Double deviationPct, Double normalizedLow, Double normalizedHigh) {}
    public record Band(double center, double halfWidth) {
        public double lower() { return center - halfWidth; }
        public double upper() { return center + halfWidth; }
    }
    public static final List<Band> BANDS = List.of(new Band(1.095,.005), new Band(1.055,.005),
            new Band(.995,.005), new Band(.980,.0025), new Band(.950,.01), new Band(.920,.005));

    public static List<Point> calculate(List<Bar> bars) {
        List<Point> result = new ArrayList<>();
        double sum = 0;
        LocalDate previous = null;
        for (int i=0; i<bars.size(); i++) {
            Bar b=bars.get(i);
            if (b.date()==null || (previous!=null && !b.date().isAfter(previous)))
                throw new IllegalArgumentException("Dates must be unique and ascending");
            previous=b.date();
            if (!Double.isFinite(b.close()) || b.close()<=0 || !Double.isFinite(b.open()) ||
                    !Double.isFinite(b.high()) || !Double.isFinite(b.low()) || b.low()<=0 ||
                    b.high()<Math.max(b.open(),b.close()) || b.low()>Math.min(b.open(),b.close()) || b.volume()<0)
                throw new IllegalArgumentException("Invalid OHLC/volume: " + b.date());
            sum+=b.close();
            if(i>=WINDOW) sum-=bars.get(i-WINDOW).close();
            Double ma=i>=WINDOW-1?sum/WINDOW:null;
            Double n=ma==null?null:b.close()/ma;
            result.add(new Point(b.date(),b.open(),b.high(),b.low(),b.close(),b.settle(),b.volume(),
                    b.openInterest(),ma,n,n==null?null:(n-1)*100,
                    ma==null?null:b.low()/ma,ma==null?null:b.high()/ma));
        }
        return List.copyOf(result);
    }
}
