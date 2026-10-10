t2w(i) = (i - 40 + 0.5) * 2, so tile (0,0) spans world [-80, -78) and the centre of tile x
is t2w(x). For centre=(15,15): t2w(15) = -49. w2t(v) = floor((v+80)/2); w2t(-50.008)=14.

Probe 0.75 ahead at heading -2.382 from pos=-50.008:
  wx = -50.008 + sin(-2.382)*0.75 = -50.7  => w2t(-50.7)=floor(14.65)=14  => BLOCKED (correct).

Mechanism: the agent integrates its position unconditionally along the (turning) heading;
only the 0.75-ahead probe is checked. Avoidance rotates the heading but movement never
stops, so the agent slides along/past the wall until the probe plots a line parallel to
the wall even though the agent's body is already deep inside the wall tile.

Fix idea (minimal): test the destination tile before integrating each axis. If the
destination tile is blocked (by an object), do not move on that axis; instead pick a new
heading via the existing avoidance/stuck logic. Also cancel the walk if the target itself
becomes unreachable/blocked for more than N seconds.
