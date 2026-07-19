import React from "react";
import './style.css';
import { NavLink } from "react-router-dom";
import { StarOutlined } from "@ant-design/icons";
const CardItem = ({image, content, imageHref, score, contentHeight = 150}) => {

    return(
            <div className="card">
                <div className="card-image">
                    <NavLink to={imageHref}>
                        <div className="shadowBox">
                            <img src={image} alt="Book Image"/>
                            <div className="shadow">
                                <StarOutlined style={{marginRight:5}}/> {score.toFixed(1)}
                            </div>
                        </div>
                    </NavLink>
                </div>
                <div className="card-content" style={{ height : contentHeight}}>
                    {content}
                </div>
            </div>
    );
}

export default CardItem;